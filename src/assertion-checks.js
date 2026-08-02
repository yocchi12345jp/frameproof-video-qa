import {normalizedFingerprintDifference} from './frame-metrics.js';
import {boxesOverlap, getPlatformOverlay} from './platform-overlays.js';

const frameRange = (from, to) => Array.from({length: Math.min(600, to - from + 1)}, (_, offset) => from + offset);
const regionFor = (manifest, assertion) => assertion.regionId ? manifest.regions.find((region) => region.id === assertion.regionId) : undefined;

const baseFinding = (assertion, code, message, details = {}) => ({
  code,
  severity: assertion.severity ?? 'error',
  message,
  frames: frameRange(assertion.from, assertion.to),
  source: assertion.source,
  details: {assertionId: assertion.id, kind: assertion.kind, expected: assertion.expected, ...details}
});

const framesWithin = (frames, from, to) => frames.filter((frame) => frame.index >= from && frame.index <= to);

export const runAssertionChecks = ({frames, manifest, audio, preset}) => {
  if (!manifest) return [];
  const findings = [];
  for (const assertion of manifest.assertions) {
    const region = regionFor(manifest, assertion);
    const source = assertion.source ?? region?.source;
    const scoped = framesWithin(frames, assertion.from, assertion.to);

    if (assertion.kind === 'motion') {
      const minimumChange = Number(assertion.expected.minimumChange ?? 0.08);
      const differences = [];
      for (let index = 1; index < scoped.length; index += 1) differences.push(normalizedFingerprintDifference(scoped[index - 1].fingerprint, scoped[index].fingerprint));
      const averageChange = differences.length ? differences.reduce((sum, value) => sum + value, 0) / differences.length : 0;
      const maximumChange = differences.length ? Math.max(...differences) : 0;
      if (averageChange < minimumChange) findings.push({...baseFinding(assertion, 'EXPECTED_MOTION_MISSING', `Expected motion ${assertion.id} averaged ${averageChange.toFixed(4)}, below ${minimumChange}.`, {actual: {averageChange, maximumChange}, minimumChange}), source});
      continue;
    }

    if (assertion.kind === 'text') {
      const style = {...region?.style, ...assertion.actual};
      const minimumPx = assertion.expected.minimumPx ?? assertion.expected.minPx;
      const maximumLines = assertion.expected.maximumLines ?? assertion.expected.maxLines;
      if (minimumPx !== undefined && Number.isFinite(Number(style.fontSizePx)) && Number(style.fontSizePx) < Number(minimumPx)) {
        findings.push({...baseFinding(assertion, 'TEXT_TOO_SMALL', `Declared text ${assertion.id} is ${style.fontSizePx}px, below ${minimumPx}px.`, {actual: {fontSizePx: Number(style.fontSizePx)}, minimumPx: Number(minimumPx)}), source});
      }
      if (maximumLines !== undefined && Number.isFinite(Number(style.lineCount)) && Number(style.lineCount) > Number(maximumLines)) {
        findings.push({...baseFinding(assertion, 'TEXT_TOO_MANY_LINES', `Declared text ${assertion.id} uses ${style.lineCount} lines, above ${maximumLines}.`, {actual: {lineCount: Number(style.lineCount)}, maximumLines: Number(maximumLines)}), source});
      }
      continue;
    }

    if (assertion.kind === 'visible') {
      const minimumStdDev = Number(assertion.expected.minimumStdDev ?? 1);
      const visibleFrames = scoped.filter((frame) => frame.luminanceStdDev >= minimumStdDev);
      const minimumVisibleRatio = Number(assertion.expected.minimumVisibleRatio ?? 0.8);
      const actualVisibleRatio = scoped.length ? visibleFrames.length / scoped.length : 0;
      if (actualVisibleRatio < minimumVisibleRatio) findings.push({...baseFinding(assertion, 'EXPECTED_VISIBLE_MISSING', `Expected visible content ${assertion.id} was present in ${(actualVisibleRatio * 100).toFixed(1)}% of frames.`, {actual: {visibleRatio: actualVisibleRatio}, minimumVisibleRatio}), source});
      continue;
    }

    if (assertion.kind === 'audio') {
      const maxUnexpectedSilenceMs = Number(assertion.expected.maxUnexpectedSilenceMs ?? 650);
      const fromSeconds = assertion.from / manifest.fps;
      const toSeconds = (assertion.to + 1) / manifest.fps;
      if (!audio?.hasAudio) {
        findings.push({...baseFinding(assertion, 'NO_AUDIO_STREAM', `Expected audio ${assertion.id}, but the export has no audio stream.`, {actual: {hasAudio: false}}), source});
        continue;
      }
      const overlaps = (audio.silenceIntervals ?? []).map((silence) => ({from: Math.max(fromSeconds, silence.startSeconds), to: Math.min(toSeconds, silence.endSeconds)})).filter((item) => item.to > item.from);
      const longestMs = overlaps.length ? Math.max(...overlaps.map((item) => (item.to - item.from) * 1000)) : 0;
      if (longestMs > maxUnexpectedSilenceMs) findings.push({...baseFinding(assertion, 'EXPECTED_AUDIO_MISSING', `Expected audio ${assertion.id} contains ${Math.round(longestMs)} ms of silence.`, {actual: {longestSilenceMs: longestMs}, maxUnexpectedSilenceMs}), source});
      continue;
    }

    if (assertion.kind === 'safe-area') {
      const box = assertion.actual?.box ?? region?.box;
      if (!box) continue;
      const overlay = getPlatformOverlay(assertion.expected.platform ?? preset);
      const margin = Number(assertion.expected.marginRatio ?? 0.05);
      const outsideMargin = box.x < margin || box.y < margin || box.x + box.width > 1 - margin || box.y + box.height > 1 - margin;
      const overlappingZones = overlay?.zones.filter((zone) => boxesOverlap(box, zone)) ?? [];
      if (outsideMargin || overlappingZones.length > 0) {
        findings.push({...baseFinding(assertion, 'SAFE_AREA_VIOLATION', `Region ${assertion.regionId ?? assertion.id} violates the declared safe area.`, {actual: {box, overlappingZones: overlappingZones.map((zone) => zone.id)}, marginRatio: margin, platform: overlay?.id}), source});
      }
    }
  }
  return findings;
};
