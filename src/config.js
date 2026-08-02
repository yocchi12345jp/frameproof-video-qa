import {readFile} from 'node:fs/promises';
import {getPreset} from './presets.js';

export const defaultConfig = Object.freeze({
  preset: undefined,
  fps: 30,
  expectedAspect: undefined,
  acceptedAspects: undefined,
  minimumAspectRatio: undefined,
  maximumAspectRatio: undefined,
  minimumWidth: undefined,
  minimumHeight: undefined,
  landscapeMaximumWidth: undefined,
  landscapeMaximumHeight: undefined,
  portraitMaximumWidth: undefined,
  portraitMaximumHeight: undefined,
  aspectTolerance: 0.002,
  maxFrozenSeconds: 2.5,
  frozenDifferenceThreshold: 0.003,
  safeMarginRatio: 0.05,
  maxEdgeActivityRatio: 0.08,
  blankStdDevThreshold: 3,
  blackLuminanceThreshold: 4,
  whiteLuminanceThreshold: 251,
  allowedContainers: undefined,
  allowedVideoCodecs: undefined,
  allowedPixelFormats: undefined,
  allowedAudioCodecs: undefined,
  maximumFps: undefined,
  maximumVideoBitRate: undefined,
  maximumDurationSeconds: undefined,
  maximumFileSizeBytes: undefined,
  recommendedMaximumFileSizeBytes: undefined,
  platformRuleSeverity: 'warning',
  maxFrames: undefined,
  maximumAnalysisFrames: 108000,
  analysisTimeoutMs: 1200000,
  checkBlankFrames: true,
  checkFrozenRuns: true,
  checkEdgeActivity: true,
  checkAspect: true,
  checkPlatformMetadata: true,
  checkCaptions: true,
  captionLanguage: 'auto',
  captionMinimumDurationMs: 650,
  captionMaximumDurationMs: 7000,
  captionMaximumCharactersPerSecond: 20,
  captionMaximumLines: 2,
  captionMaximumLineLength: undefined,
  captionMinimumGapMs: 80,
  captionBox: {x: 0.08, y: 0.72, width: 0.84, height: 0.2},
  checkAudioIntegrity: false,
  requireAudioStream: false,
  checkUnexpectedSilence: false,
  silenceNoiseDb: -45,
  silenceMinimumSeconds: 0.65,
  maxUnexpectedSilenceSeconds: 3,
  minimumIntegratedLufs: -24,
  maximumIntegratedLufs: -12,
  maximumTruePeakDbtp: -1
});

const finiteNumber = (value, name, {min = -Infinity, max = Infinity, required = true} = {}) => {
  if (value === undefined && !required) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${name} must be a finite number between ${min} and ${max}`);
  }
  return value;
};

const booleanValue = (value, name) => {
  if (typeof value !== 'boolean') throw new Error(`${name} must be a boolean`);
  return value;
};

const optionalStringArray = (value, name) => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== 'string' || item.trim() === '')) {
    throw new Error(`${name} must be a non-empty array of strings`);
  }
  return value.map((item) => item.trim().toLowerCase());
};

const validateAspect = (aspect, name) => {
  if (!/^\d+(?:\.\d+)?:\d+(?:\.\d+)?$/.test(aspect)) {
    throw new Error(`${name} must look like 16:9 or 9:16`);
  }
};

export const validateConfig = (candidate) => {
  const config = {...defaultConfig, ...candidate};
  finiteNumber(config.fps, 'fps', {min: 0.001});
  finiteNumber(config.aspectTolerance, 'aspectTolerance', {min: 0});
  finiteNumber(config.maxFrozenSeconds, 'maxFrozenSeconds', {min: 0.001});
  finiteNumber(config.frozenDifferenceThreshold, 'frozenDifferenceThreshold', {min: 0, max: 1});
  finiteNumber(config.safeMarginRatio, 'safeMarginRatio', {min: 0, max: 0.25});
  finiteNumber(config.maxEdgeActivityRatio, 'maxEdgeActivityRatio', {min: 0, max: 1});
  finiteNumber(config.blankStdDevThreshold, 'blankStdDevThreshold', {min: 0});
  finiteNumber(config.blackLuminanceThreshold, 'blackLuminanceThreshold', {min: 0, max: 255});
  finiteNumber(config.whiteLuminanceThreshold, 'whiteLuminanceThreshold', {min: 0, max: 255});
  finiteNumber(config.minimumAspectRatio, 'minimumAspectRatio', {min: 0.001, required: false});
  finiteNumber(config.maximumAspectRatio, 'maximumAspectRatio', {min: 0.001, required: false});
  finiteNumber(config.minimumWidth, 'minimumWidth', {min: 1, required: false});
  finiteNumber(config.minimumHeight, 'minimumHeight', {min: 1, required: false});
  finiteNumber(config.landscapeMaximumWidth, 'landscapeMaximumWidth', {min: 1, required: false});
  finiteNumber(config.landscapeMaximumHeight, 'landscapeMaximumHeight', {min: 1, required: false});
  finiteNumber(config.portraitMaximumWidth, 'portraitMaximumWidth', {min: 1, required: false});
  finiteNumber(config.portraitMaximumHeight, 'portraitMaximumHeight', {min: 1, required: false});
  finiteNumber(config.maximumFps, 'maximumFps', {min: 0.001, required: false});
  finiteNumber(config.maximumVideoBitRate, 'maximumVideoBitRate', {min: 1, required: false});
  finiteNumber(config.maximumDurationSeconds, 'maximumDurationSeconds', {min: 0, required: false});
  finiteNumber(config.maximumFileSizeBytes, 'maximumFileSizeBytes', {min: 1, required: false});
  finiteNumber(config.recommendedMaximumFileSizeBytes, 'recommendedMaximumFileSizeBytes', {min: 1, required: false});
  finiteNumber(config.maxFrames, 'maxFrames', {min: 1, required: false});
  finiteNumber(config.maximumAnalysisFrames, 'maximumAnalysisFrames', {min: 1});
  finiteNumber(config.analysisTimeoutMs, 'analysisTimeoutMs', {min: 1000});
  booleanValue(config.checkBlankFrames, 'checkBlankFrames');
  booleanValue(config.checkFrozenRuns, 'checkFrozenRuns');
  booleanValue(config.checkEdgeActivity, 'checkEdgeActivity');
  booleanValue(config.checkAspect, 'checkAspect');
  booleanValue(config.checkPlatformMetadata, 'checkPlatformMetadata');
  booleanValue(config.checkCaptions, 'checkCaptions');
  booleanValue(config.checkAudioIntegrity, 'checkAudioIntegrity');
  booleanValue(config.requireAudioStream, 'requireAudioStream');
  booleanValue(config.checkUnexpectedSilence, 'checkUnexpectedSilence');
  finiteNumber(config.captionMinimumDurationMs, 'captionMinimumDurationMs', {min: 1});
  finiteNumber(config.captionMaximumDurationMs, 'captionMaximumDurationMs', {min: 1});
  finiteNumber(config.captionMaximumCharactersPerSecond, 'captionMaximumCharactersPerSecond', {min: 0.1});
  finiteNumber(config.captionMaximumLines, 'captionMaximumLines', {min: 1});
  finiteNumber(config.captionMaximumLineLength, 'captionMaximumLineLength', {min: 1, required: false});
  finiteNumber(config.captionMinimumGapMs, 'captionMinimumGapMs', {min: 0});
  finiteNumber(config.silenceNoiseDb, 'silenceNoiseDb', {min: -100, max: 0});
  finiteNumber(config.silenceMinimumSeconds, 'silenceMinimumSeconds', {min: 0.01});
  finiteNumber(config.maxUnexpectedSilenceSeconds, 'maxUnexpectedSilenceSeconds', {min: 0.01});
  finiteNumber(config.minimumIntegratedLufs, 'minimumIntegratedLufs', {min: -70, max: 0});
  finiteNumber(config.maximumIntegratedLufs, 'maximumIntegratedLufs', {min: -70, max: 0});
  finiteNumber(config.maximumTruePeakDbtp, 'maximumTruePeakDbtp', {min: -20, max: 20});

  if (config.preset !== undefined && (typeof config.preset !== 'string' || config.preset.trim() === '')) {
    throw new Error('preset must be a non-empty string');
  }
  if (config.expectedAspect !== undefined) validateAspect(config.expectedAspect, 'expectedAspect');
  if (config.acceptedAspects !== undefined) {
    if (!Array.isArray(config.acceptedAspects) || config.acceptedAspects.length === 0) {
      throw new Error('acceptedAspects must be a non-empty array');
    }
    for (const aspect of config.acceptedAspects) validateAspect(aspect, 'acceptedAspects entry');
  }
  config.allowedContainers = optionalStringArray(config.allowedContainers, 'allowedContainers');
  config.allowedVideoCodecs = optionalStringArray(config.allowedVideoCodecs, 'allowedVideoCodecs');
  config.allowedPixelFormats = optionalStringArray(config.allowedPixelFormats, 'allowedPixelFormats');
  config.allowedAudioCodecs = optionalStringArray(config.allowedAudioCodecs, 'allowedAudioCodecs');

  if (!['auto', 'ja', 'en'].includes(config.captionLanguage)) throw new Error('captionLanguage must be auto, ja, or en');
  if (!config.captionBox || typeof config.captionBox !== 'object') throw new Error('captionBox must be an object');
  for (const key of ['x', 'y', 'width', 'height']) finiteNumber(config.captionBox[key], `captionBox.${key}`, {min: 0, max: 1});
  if (config.captionBox.x + config.captionBox.width > 1.000001 || config.captionBox.y + config.captionBox.height > 1.000001) throw new Error('captionBox must fit inside normalized 0..1 coordinates');
  if (config.captionMinimumDurationMs > config.captionMaximumDurationMs) throw new Error('captionMinimumDurationMs must not exceed captionMaximumDurationMs');
  if (config.minimumIntegratedLufs > config.maximumIntegratedLufs) throw new Error('minimumIntegratedLufs must not exceed maximumIntegratedLufs');

  if (!['warning', 'error'].includes(config.platformRuleSeverity)) {
    throw new Error('platformRuleSeverity must be warning or error');
  }
  if (config.blackLuminanceThreshold >= config.whiteLuminanceThreshold) {
    throw new Error('blackLuminanceThreshold must be lower than whiteLuminanceThreshold');
  }
  if (config.minimumAspectRatio !== undefined && config.maximumAspectRatio !== undefined && config.minimumAspectRatio > config.maximumAspectRatio) {
    throw new Error('minimumAspectRatio must not exceed maximumAspectRatio');
  }
  if (config.maximumFileSizeBytes !== undefined && config.recommendedMaximumFileSizeBytes !== undefined &&
      config.recommendedMaximumFileSizeBytes > config.maximumFileSizeBytes) {
    throw new Error('recommendedMaximumFileSizeBytes must not exceed maximumFileSizeBytes');
  }
  return config;
};

export const loadConfig = async (configPath, overrides = {}) => {
  let fileConfig = {};
  if (configPath) {
    const raw = await readFile(configPath, 'utf8');
    fileConfig = JSON.parse(raw);
  }
  const compactOverrides = Object.fromEntries(
    Object.entries(overrides).filter(([, value]) => value !== undefined)
  );
  const presetName = compactOverrides.preset ?? fileConfig.preset;
  const presetConfig = presetName ? getPreset(presetName).config : {};
  return validateConfig({...presetConfig, ...fileConfig, ...compactOverrides, preset: presetName});
};

export const aspectToNumber = (aspect) => {
  const [width, height] = aspect.split(':').map(Number);
  if (!width || !height) throw new Error(`Invalid aspect ratio: ${aspect}`);
  return width / height;
};
