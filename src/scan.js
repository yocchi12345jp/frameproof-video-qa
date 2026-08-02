import {probeInput, streamGrayscaleFrames} from './ffmpeg.js';
import {analyzeGrayFrame} from './frame-metrics.js';
import {runChecks} from './checks/run-checks.js';
import {loadManifest, enrichFindingsWithManifest, validateManifest} from './manifest.js';
import {loadCaptions, auditCaptions} from './captions.js';
import {analyzeAudio, auditAudio} from './audio.js';
import {runAssertionChecks} from './assertion-checks.js';
import {attachFixPackets} from './fix-packet.js';
import {REPORT_SCHEMA_VERSION, VERSION} from './version.js';

const ANALYSIS_WIDTH = 64;
const ANALYSIS_HEIGHT = 64;

const manifestCompatibilityFindings = (manifest, metadata) => {
  if (!manifest) return [];
  const findings = [];
  if (Math.abs(manifest.fps - metadata.fps) > 0.001) {
    findings.push({
      code: 'MANIFEST_FPS_MISMATCH',
      severity: 'error',
      message: `Manifest uses ${manifest.fps} fps but the export uses ${metadata.fps.toFixed(3)} fps.`,
      frames: [],
      details: {expected: {fps: manifest.fps}, actual: {fps: metadata.fps}}
    });
  }
  if (manifest.width && manifest.height && (manifest.width !== metadata.width || manifest.height !== metadata.height)) {
    findings.push({
      code: 'MANIFEST_DIMENSIONS_MISMATCH',
      severity: 'error',
      message: `Manifest dimensions ${manifest.width}x${manifest.height} do not match export ${metadata.width}x${metadata.height}.`,
      frames: [],
      details: {expected: {width: manifest.width, height: manifest.height}, actual: {width: metadata.width, height: metadata.height}}
    });
  }
  const expectedDuration = manifest.durationInFrames / manifest.fps;
  if (metadata.durationSeconds !== undefined && Math.abs(expectedDuration - metadata.durationSeconds) > Math.max(0.1, 1 / manifest.fps * 2)) {
    findings.push({
      code: 'MANIFEST_DURATION_MISMATCH',
      severity: 'warning',
      message: `Manifest duration ${expectedDuration.toFixed(3)}s differs from export ${metadata.durationSeconds.toFixed(3)}s.`,
      frames: [],
      details: {expected: {durationSeconds: expectedDuration}, actual: {durationSeconds: metadata.durationSeconds}}
    });
  }
  return findings;
};

const resolveContext = async (context = {}) => {
  const manifest = context.manifestPath ? await loadManifest(context.manifestPath) : context.manifest ? validateManifest(context.manifest) : undefined;
  const captions = context.captionsPath ? await loadCaptions(context.captionsPath) : context.captions;
  return {manifest, captions, manifestPath: context.manifestPath, captionsPath: context.captionsPath};
};

export const scanInput = async (input, config, contextInput = {}) => {
  const context = await resolveContext(contextInput);
  const metadata = await probeInput(input, config.fps);
  const effectiveFps = metadata.fps || config.fps;
  const effectiveConfig = {...config, fps: effectiveFps};
  const estimatedFrames = metadata.frameCount ?? (metadata.durationSeconds !== undefined ? Math.ceil(metadata.durationSeconds * effectiveFps) : undefined);
  const plannedFrames = estimatedFrames === undefined
    ? effectiveConfig.maxFrames
    : Math.min(estimatedFrames, effectiveConfig.maxFrames ?? Number.POSITIVE_INFINITY);
  if (plannedFrames !== undefined && plannedFrames > effectiveConfig.maximumAnalysisFrames) {
    throw new Error(`Analysis would decode approximately ${Math.ceil(plannedFrames)} frames, exceeding maximumAnalysisFrames=${effectiveConfig.maximumAnalysisFrames}. Set --max-frames for an intentional sample or increase --maximum-analysis-frames.`);
  }
  const frames = [];

  await streamGrayscaleFrames({
    input,
    inputFps: config.fps,
    width: ANALYSIS_WIDTH,
    height: ANALYSIS_HEIGHT,
    maxFrames: config.maxFrames,
    timeoutMs: effectiveConfig.analysisTimeoutMs,
    signal: contextInput.signal,
    onFrame: async (buffer, index) => {
      frames.push(analyzeGrayFrame(buffer, ANALYSIS_WIDTH, ANALYSIS_HEIGHT, effectiveConfig.safeMarginRatio, index, effectiveFps));
    }
  });

  if (frames.length === 0) throw new Error('No frames were decoded');

  const hasAudioAssertion = context.manifest?.assertions.some((assertion) => assertion.kind === 'audio') ?? false;
  const audio = (effectiveConfig.checkAudioIntegrity || hasAudioAssertion)
    ? await analyzeAudio(input, metadata, {
      silenceNoiseDb: effectiveConfig.silenceNoiseDb,
      silenceMinimumSeconds: effectiveConfig.silenceMinimumSeconds,
      measureLoudness: effectiveConfig.checkAudioIntegrity
    })
    : undefined;

  let findings = [
    ...runChecks(frames, metadata, effectiveConfig),
    ...manifestCompatibilityFindings(context.manifest, metadata)
  ];

  if (context.captions && effectiveConfig.checkCaptions) {
    findings.push(...auditCaptions(context.captions, {
      fps: effectiveFps,
      durationSeconds: metadata.durationSeconds,
      language: effectiveConfig.captionLanguage,
      minimumDurationMs: effectiveConfig.captionMinimumDurationMs,
      maximumDurationMs: effectiveConfig.captionMaximumDurationMs,
      maximumCharactersPerSecond: effectiveConfig.captionMaximumCharactersPerSecond,
      maximumLines: effectiveConfig.captionMaximumLines,
      maximumLineLength: effectiveConfig.captionMaximumLineLength,
      minimumGapMs: effectiveConfig.captionMinimumGapMs,
      captionBox: effectiveConfig.captionBox,
      manifest: context.manifest
    }));
  }

  if (audio && effectiveConfig.checkAudioIntegrity) {
    findings.push(...auditAudio(audio, metadata, effectiveConfig, {expected: hasAudioAssertion}));
  }

  findings.push(...runAssertionChecks({frames, manifest: context.manifest, audio, preset: effectiveConfig.preset}));
  findings = enrichFindingsWithManifest(findings, context.manifest);

  const errors = findings.filter((finding) => finding.severity === 'error').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const baseReport = {
    schemaVersion: REPORT_SCHEMA_VERSION,
    toolVersion: VERSION,
    generatedAt: new Date().toISOString(),
    input,
    metadata,
    config: effectiveConfig,
    context: {
      mode: context.manifest ? 'source-aware' : 'file-only',
      manifestPath: context.manifestPath,
      captionsPath: context.captionsPath,
      compositionId: context.manifest?.compositionId,
      captionCount: context.captions?.length
    },
    manifest: context.manifest,
    captions: context.captions ? {count: context.captions.length, firstStartMs: context.captions[0]?.startMs, lastEndMs: context.captions.at(-1)?.endMs} : undefined,
    audio,
    summary: {frameCount: frames.length, errors, warnings, passed: errors === 0},
    frames,
    findings
  };
  return attachFixPackets(baseReport);
};
