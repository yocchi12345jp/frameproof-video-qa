import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {boxesOverlap} from './platform-overlays.js';

const parseClock = (value) => {
  const normalized = value.trim().replace(',', '.');
  const parts = normalized.split(':').map(Number);
  if (parts.some((part) => !Number.isFinite(part))) throw new Error(`Invalid caption timestamp: ${value}`);
  if (parts.length === 3) return ((parts[0] * 60 + parts[1]) * 60 + parts[2]) * 1000;
  if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
  throw new Error(`Invalid caption timestamp: ${value}`);
};

const cue = (startMs, endMs, text, index, extra = {}) => {
  const normalized = {
    id: String(extra.id ?? index + 1),
    startMs: Number(startMs),
    endMs: Number(endMs),
    text: String(text ?? '').trim()
  };
  for (const [key, value] of Object.entries(extra)) if (value !== undefined) normalized[key] = key === 'id' ? String(value) : value;
  return normalized;
};

export const parseSrt = (raw) => raw.replaceAll('\r\n', '\n').trim().split(/\n{2,}/).flatMap((block, index) => {
  const lines = block.split('\n');
  const timingIndex = lines.findIndex((line) => line.includes('-->'));
  if (timingIndex < 0) return [];
  const [start, end] = lines[timingIndex].split('-->').map((value) => value.trim().split(/\s+/)[0]);
  return [cue(parseClock(start), parseClock(end), lines.slice(timingIndex + 1).join('\n'), index, {id: timingIndex > 0 ? lines[0].trim() : undefined})];
});

export const parseVtt = (raw) => {
  const cleaned = raw.replace(/^\uFEFF?WEBVTT[^\n]*\n+/, '').replaceAll('\r\n', '\n');
  return cleaned.trim().split(/\n{2,}/).flatMap((block, index) => {
    const lines = block.split('\n').filter((line) => !line.startsWith('NOTE'));
    const timingIndex = lines.findIndex((line) => line.includes('-->'));
    if (timingIndex < 0) return [];
    const [start, endAndSettings] = lines[timingIndex].split('-->');
    const end = endAndSettings.trim().split(/\s+/)[0];
    return [cue(parseClock(start), parseClock(end), lines.slice(timingIndex + 1).join('\n'), index, {id: timingIndex > 0 ? lines[0].trim() : undefined})];
  });
};

const secondsOrMs = (value, key) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) throw new Error(`${key} must be numeric`);
  return /Ms$/.test(key) ? numeric : numeric * 1000;
};

const parseJsonCue = (entry, index) => {
  const startKey = ['startMs', 'timestampMs', 'start', 'startTime'].find((key) => entry[key] !== undefined);
  const endKey = ['endMs', 'end', 'endTime'].find((key) => entry[key] !== undefined);
  if (!startKey || !endKey) throw new Error(`Caption JSON entry ${index} must include start/end timing`);
  return cue(secondsOrMs(entry[startKey], startKey), secondsOrMs(entry[endKey], endKey), entry.text ?? entry.value ?? entry.word, index, {
    id: entry.id,
    confidence: entry.confidence,
    metadata: entry.metadata
  });
};

export const parseCaptionJson = (raw) => {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const entries = Array.isArray(parsed) ? parsed : parsed.captions ?? parsed.words ?? parsed.segments;
  if (!Array.isArray(entries)) throw new Error('Caption JSON must be an array or contain captions, words, or segments');
  return entries.map(parseJsonCue);
};

export const loadCaptions = async (captionsPath) => {
  const raw = await readFile(captionsPath, 'utf8');
  const extension = path.extname(captionsPath).toLowerCase();
  const cues = extension === '.srt' ? parseSrt(raw) : extension === '.vtt' ? parseVtt(raw) : parseCaptionJson(raw);
  return cues.toSorted((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
};

const containsJapanese = (text) => /[\u3040-\u30ff\u3400-\u9fff]/u.test(text);
const nonWhitespaceCharacters = (text) => [...text.replace(/\s/gu, '')].length;
const toFrames = (caption, fps) => {
  const from = Math.max(0, Math.floor(caption.startMs / 1000 * fps));
  const to = Math.max(from, Math.ceil(caption.endMs / 1000 * fps) - 1);
  return Array.from({length: Math.min(600, to - from + 1)}, (_, offset) => from + offset);
};

const finding = (code, severity, message, caption, fps, details = {}) => ({
  code,
  severity,
  message,
  frames: toFrames(caption, fps),
  details: {captionId: caption.id, startMs: caption.startMs, endMs: caption.endMs, text: caption.text, ...details}
});

const intervalOverlap = (a, b) => a.startMs < b.endMs && a.endMs > b.startMs;

export const auditCaptions = (captions, {
  fps,
  durationSeconds,
  language = 'auto',
  minimumDurationMs = 650,
  maximumDurationMs = 7000,
  maximumCharactersPerSecond = 20,
  maximumLines = 2,
  maximumLineLength,
  minimumGapMs = 80,
  captionBox = {x: 0.08, y: 0.72, width: 0.84, height: 0.2},
  manifest
}) => {
  const findings = [];
  const durationMs = durationSeconds === undefined ? undefined : durationSeconds * 1000;
  const normalized = captions.toSorted((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);

  normalized.forEach((caption, index) => {
    const cueDuration = caption.endMs - caption.startMs;
    if (!(cueDuration > 0)) {
      findings.push(finding('CAPTION_INVALID_DURATION', 'error', `Caption ${caption.id} has an invalid duration.`, caption, fps, {durationMs: cueDuration}));
      return;
    }
    if (caption.startMs < 0 || (durationMs !== undefined && caption.endMs > durationMs + 1)) {
      findings.push(finding('CAPTION_OUTSIDE_DURATION', 'error', `Caption ${caption.id} extends outside the video duration.`, caption, fps, {videoDurationMs: durationMs}));
    }
    if (cueDuration < minimumDurationMs) {
      findings.push(finding('CAPTION_TOO_SHORT', 'warning', `Caption ${caption.id} is displayed for only ${cueDuration} ms.`, caption, fps, {actualDurationMs: cueDuration, minimumDurationMs}));
    }
    if (cueDuration > maximumDurationMs) {
      findings.push(finding('CAPTION_TOO_LONG', 'warning', `Caption ${caption.id} is displayed for ${(cueDuration / 1000).toFixed(2)} seconds.`, caption, fps, {actualDurationMs: cueDuration, maximumDurationMs}));
    }
    const characters = nonWhitespaceCharacters(caption.text);
    const cps = characters / (cueDuration / 1000);
    if (cps > maximumCharactersPerSecond) {
      findings.push(finding('CAPTION_TOO_FAST', 'warning', `Caption ${caption.id} requires ${cps.toFixed(1)} characters per second.`, caption, fps, {actualCharactersPerSecond: cps, maximumCharactersPerSecond}));
    }
    const lines = caption.text.split(/\n/);
    if (lines.length > maximumLines) {
      findings.push(finding('CAPTION_TOO_MANY_LINES', 'warning', `Caption ${caption.id} uses ${lines.length} lines.`, caption, fps, {actualLines: lines.length, maximumLines}));
    }
    const effectiveLanguage = language === 'auto' ? (containsJapanese(caption.text) ? 'ja' : 'en') : language;
    const lineLimit = maximumLineLength ?? (effectiveLanguage === 'ja' ? 16 : 42);
    const longest = Math.max(...lines.map(nonWhitespaceCharacters), 0);
    if (longest > lineLimit) {
      findings.push(finding('CAPTION_LINE_TOO_LONG', 'warning', `Caption ${caption.id} has a ${longest}-character line.`, caption, fps, {actualLineLength: longest, maximumLineLength: lineLimit, language: effectiveLanguage}));
    }

    const next = normalized[index + 1];
    if (next) {
      const gap = next.startMs - caption.endMs;
      if (gap < 0) findings.push(finding('CAPTION_OVERLAP', 'error', `Captions ${caption.id} and ${next.id} overlap by ${Math.abs(gap)} ms.`, caption, fps, {nextCaptionId: next.id, overlapMs: Math.abs(gap)}));
      else if (gap > 0 && gap < minimumGapMs) findings.push(finding('CAPTION_GAP_TOO_SHORT', 'warning', `Captions ${caption.id} and ${next.id} are separated by only ${gap} ms.`, caption, fps, {nextCaptionId: next.id, actualGapMs: gap, minimumGapMs}));
    }

    if (manifest) {
      const cueInterval = {startMs: caption.startMs, endMs: caption.endMs};
      for (const region of manifest.regions.filter((item) => item.box && ['ui', 'cta', 'lower-third', 'caption-exclusion'].includes(item.role))) {
        const regionInterval = {startMs: region.from / manifest.fps * 1000, endMs: (region.to + 1) / manifest.fps * 1000};
        if (intervalOverlap(cueInterval, regionInterval) && boxesOverlap(captionBox, region.box)) {
          findings.push({
            ...finding('CAPTION_REGION_COLLISION', 'error', `Caption ${caption.id} overlaps declared region ${region.id}.`, caption, fps, {regionId: region.id, captionBox, regionBox: region.box}),
            source: region.source
          });
        }
      }
    }
  });
  return findings;
};
