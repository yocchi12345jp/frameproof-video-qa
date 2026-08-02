import {runProcess} from './ffmpeg.js';

const finite = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseSilence = (stderr, durationSeconds) => {
  const intervals = [];
  let openStart;
  for (const line of stderr.split(/\r?\n/)) {
    const start = line.match(/silence_start:\s*([\d.]+)/);
    if (start) openStart = Number(start[1]);
    const end = line.match(/silence_end:\s*([\d.]+)\s*\|\s*silence_duration:\s*([\d.]+)/);
    if (end) {
      intervals.push({
        startSeconds: openStart ?? Math.max(0, Number(end[1]) - Number(end[2])),
        endSeconds: Number(end[1]),
        durationSeconds: Number(end[2])
      });
      openStart = undefined;
    }
  }
  if (openStart !== undefined && durationSeconds !== undefined && durationSeconds > openStart) {
    intervals.push({startSeconds: openStart, endSeconds: durationSeconds, durationSeconds: durationSeconds - openStart});
  }
  return intervals;
};

const extractLoudnormJson = (stderr) => {
  const matches = [...stderr.matchAll(/\{\s*"input_i"[\s\S]*?\}/g)];
  if (matches.length === 0) return undefined;
  try {
    const parsed = JSON.parse(matches.at(-1)[0]);
    return {
      integratedLufs: finite(parsed.input_i),
      truePeakDbtp: finite(parsed.input_tp),
      loudnessRangeLu: finite(parsed.input_lra),
      thresholdLufs: finite(parsed.input_thresh),
      targetOffsetLu: finite(parsed.target_offset)
    };
  } catch {
    return undefined;
  }
};

export const analyzeAudio = async (input, metadata, {
  silenceNoiseDb = -45,
  silenceMinimumSeconds = 0.65,
  measureLoudness = true
} = {}) => {
  if (!metadata.audioCodec) {
    return {hasAudio: false, channels: 0, sampleRate: undefined, silenceIntervals: [], loudness: undefined};
  }

  const silenceResult = await runProcess('ffmpeg', [
    '-hide_banner', '-nostats', '-i', input,
    '-map', '0:a:0', '-af', `silencedetect=noise=${silenceNoiseDb}dB:d=${silenceMinimumSeconds}`,
    '-f', 'null', '-'
  ], {allowFailure: true});

  let loudness;
  if (measureLoudness) {
    const loudnessResult = await runProcess('ffmpeg', [
      '-hide_banner', '-nostats', '-i', input,
      '-map', '0:a:0', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json',
      '-f', 'null', '-'
    ], {allowFailure: true});
    loudness = extractLoudnormJson(loudnessResult.stderr.toString('utf8'));
  }

  return {
    hasAudio: true,
    codec: metadata.audioCodec,
    channels: metadata.audioChannels,
    sampleRate: metadata.audioSampleRate,
    silenceThresholdDb: silenceNoiseDb,
    silenceMinimumSeconds,
    silenceIntervals: parseSilence(silenceResult.stderr.toString('utf8'), metadata.durationSeconds),
    loudness
  };
};

const framesForSeconds = (start, end, fps) => {
  const from = Math.max(0, Math.floor(start * fps));
  const to = Math.max(from, Math.ceil(end * fps) - 1);
  return Array.from({length: Math.min(600, to - from + 1)}, (_, offset) => from + offset);
};

export const auditAudio = (audio, metadata, config, {expected = false} = {}) => {
  const findings = [];
  if (!audio?.hasAudio) {
    if (expected || config.requireAudioStream) {
      findings.push({
        code: 'NO_AUDIO_STREAM',
        severity: 'error',
        message: 'The final export does not contain an audio stream.',
        frames: [],
        details: {expected: {hasAudio: true}, actual: {hasAudio: false}}
      });
    }
    return findings;
  }

  if (config.checkUnexpectedSilence) {
    for (const silence of audio.silenceIntervals.filter((item) => item.durationSeconds > config.maxUnexpectedSilenceSeconds)) {
      findings.push({
        code: 'UNEXPECTED_SILENCE',
        severity: 'warning',
        message: `Audio is silent for ${silence.durationSeconds.toFixed(2)} seconds from ${silence.startSeconds.toFixed(2)}s.`,
        frames: framesForSeconds(silence.startSeconds, silence.endSeconds, metadata.fps),
        details: {
          actual: {durationSeconds: silence.durationSeconds, startSeconds: silence.startSeconds, endSeconds: silence.endSeconds},
          maximumSilenceSeconds: config.maxUnexpectedSilenceSeconds
        }
      });
    }
  }

  const loudness = audio.loudness;
  if (loudness?.integratedLufs !== undefined && (loudness.integratedLufs < config.minimumIntegratedLufs || loudness.integratedLufs > config.maximumIntegratedLufs)) {
    findings.push({
      code: 'AUDIO_LOUDNESS_OUT_OF_RANGE',
      severity: 'warning',
      message: `Integrated loudness is ${loudness.integratedLufs.toFixed(1)} LUFS, outside ${config.minimumIntegratedLufs} to ${config.maximumIntegratedLufs} LUFS.`,
      frames: [],
      details: {actual: {integratedLufs: loudness.integratedLufs}, minimumIntegratedLufs: config.minimumIntegratedLufs, maximumIntegratedLufs: config.maximumIntegratedLufs}
    });
  }
  if (loudness?.truePeakDbtp !== undefined && loudness.truePeakDbtp > config.maximumTruePeakDbtp) {
    findings.push({
      code: 'AUDIO_TRUE_PEAK_TOO_HIGH',
      severity: 'warning',
      message: `True peak is ${loudness.truePeakDbtp.toFixed(1)} dBTP, above ${config.maximumTruePeakDbtp} dBTP.`,
      frames: [],
      details: {actual: {truePeakDbtp: loudness.truePeakDbtp}, maximumTruePeakDbtp: config.maximumTruePeakDbtp}
    });
  }
  return findings;
};
