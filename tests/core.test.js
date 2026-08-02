import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultConfig, loadConfig} from '../src/config.js';
import {analyzeGrayFrame, normalizedFingerprintDifference} from '../src/frame-metrics.js';
import {runChecks} from '../src/checks/run-checks.js';
import {getPreset, listPresets} from '../src/presets.js';

const makeFrame = (index, overrides = {}) => ({
  index,
  timestampSeconds: index / 30,
  meanLuminance: 120,
  luminanceStdDev: 30,
  edgeActivityRatio: 0.01,
  fingerprint: [10 + index, 20, 30, 40],
  ...overrides
});

const metadata = {
  width: 1920,
  height: 1080,
  fps: 30,
  durationSeconds: 10,
  codec: 'h264',
  pixelFormat: 'yuv420p',
  container: 'mov,mp4,m4a,3gp,3g2,mj2',
  fileSizeBytes: 1_000_000,
  audioCodec: 'aac'
};

test('normalized fingerprint difference is bounded', () => {
  assert.equal(normalizedFingerprintDifference([0, 127, 255], [0, 127, 255]), 0);
  assert.equal(normalizedFingerprintDifference([0, 0], [255, 255]), 1);
});

test('gray frame metrics are deterministic', () => {
  const buffer = Buffer.alloc(64 * 64, 100);
  const result = analyzeGrayFrame(buffer, 64, 64, 0.05, 3, 30);
  assert.equal(result.meanLuminance, 100);
  assert.equal(result.luminanceStdDev, 0);
  assert.equal(result.timestampSeconds, 0.1);
  assert.equal(result.fingerprint.length, 256);
});

test('aspect mismatch is an error', () => {
  const findings = runChecks([makeFrame(0)], {...metadata, width: 1080, height: 1920}, {...defaultConfig, expectedAspect: '16:9'});
  assert.ok(findings.some((finding) => finding.code === 'ASPECT_RATIO_MISMATCH' && finding.severity === 'error'));
});

test('blank frames are errors', () => {
  const findings = runChecks([makeFrame(0, {meanLuminance: 0.5, luminanceStdDev: 0.1})], metadata, defaultConfig);
  assert.ok(findings.some((finding) => finding.code === 'BLANK_FRAME'));
});

test('long frozen runs are warnings', () => {
  const frames = Array.from({length: 6}, (_, index) => makeFrame(index, {fingerprint: [10, 20, 30, 40]}));
  const findings = runChecks(frames, {...metadata, fps: 2}, {...defaultConfig, fps: 2, maxFrozenSeconds: 2.5});
  assert.ok(findings.some((finding) => finding.code === 'FROZEN_RUN' && finding.severity === 'warning'));
});

test('preset catalog exposes X profiles', () => {
  assert.ok(listPresets().some((preset) => preset.name === 'x-video'));
  assert.equal(getPreset('x-ad').config.platformRuleSeverity, 'error');
  assert.throws(() => getPreset('missing'), /Unknown preset/);
});

test('loadConfig applies preset before explicit overrides', async () => {
  const config = await loadConfig(undefined, {preset: 'x-ad', expectedAspect: '9:16'});
  assert.equal(config.preset, 'x-ad');
  assert.equal(config.expectedAspect, '9:16');
  assert.deepEqual(config.allowedVideoCodecs, ['h264']);
  assert.equal(config.maximumFps, 60);
});


test('X standard video profile enforces web upload limits', async () => {
  const config = await loadConfig(undefined, {preset: 'x-video', maxFrozenSeconds: 100});
  const incompatible = {
    ...metadata,
    width: 2000,
    height: 1300,
    fps: 41,
    videoBitRate: 25_000_001,
    durationSeconds: 141,
    fileSizeBytes: 512_000_001
  };
  const findings = runChecks([makeFrame(0), makeFrame(1)], incompatible, config);
  const codes = new Set(findings.map((finding) => finding.code));
  assert.ok(codes.has('PLATFORM_RESOLUTION_TOO_LARGE'));
  assert.ok(codes.has('PLATFORM_FRAME_RATE_TOO_HIGH'));
  assert.ok(codes.has('PLATFORM_BIT_RATE_TOO_HIGH'));
  assert.ok(codes.has('PLATFORM_DURATION_TOO_LONG'));
  assert.ok(codes.has('PLATFORM_FILE_TOO_LARGE'));
});

test('X ad profile reports incompatible technical metadata', async () => {
  const config = await loadConfig(undefined, {preset: 'x-ad', maxFrozenSeconds: 100});
  const incompatible = {
    ...metadata,
    width: 1000,
    height: 777,
    fps: 61,
    durationSeconds: 141,
    codec: 'hevc',
    pixelFormat: 'yuv444p',
    container: 'matroska,webm',
    fileSizeBytes: 1_000_000_001,
    audioCodec: 'mp3'
  };
  const findings = runChecks([makeFrame(0), makeFrame(1)], incompatible, config);
  const codes = new Set(findings.map((finding) => finding.code));
  assert.ok(codes.has('PLATFORM_ASPECT_UNSUPPORTED'));
  assert.ok(codes.has('PLATFORM_CONTAINER_UNSUPPORTED'));
  assert.ok(codes.has('PLATFORM_VIDEO_CODEC_UNSUPPORTED'));
  assert.ok(codes.has('PLATFORM_PIXEL_FORMAT_UNSUPPORTED'));
  assert.ok(codes.has('PLATFORM_AUDIO_CODEC_UNSUPPORTED'));
  assert.ok(codes.has('PLATFORM_FRAME_RATE_TOO_HIGH'));
  assert.ok(codes.has('PLATFORM_DURATION_TOO_LONG'));
  assert.ok(codes.has('PLATFORM_FILE_TOO_LARGE'));
  assert.ok(findings.filter((finding) => finding.code.startsWith('PLATFORM_')).every((finding) => finding.severity === 'error'));
});


test('individual rule groups can be disabled', () => {
  const blank = makeFrame(0, {meanLuminance: 0, luminanceStdDev: 0, edgeActivityRatio: 1, fingerprint: [1, 1, 1, 1]});
  const findings = runChecks([blank, {...blank, index: 1}], {...metadata, width: 1080, height: 1920}, {
    ...defaultConfig,
    expectedAspect: '16:9',
    checkBlankFrames: false,
    checkFrozenRuns: false,
    checkEdgeActivity: false,
    checkAspect: false,
    checkPlatformMetadata: false
  });
  assert.deepEqual(findings, []);
});
