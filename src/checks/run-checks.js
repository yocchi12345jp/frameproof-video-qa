import {aspectToNumber} from '../config.js';
import {normalizedFingerprintDifference} from '../frame-metrics.js';

const ratioMatches = (actual, expected, tolerance) => Math.abs(actual - aspectToNumber(expected)) <= tolerance;

const platformFinding = (config, code, message, details = {}, severity = config.platformRuleSeverity) => ({
  code,
  severity,
  message,
  frames: [],
  details: {preset: config.preset, ...details}
});

export const runChecks = (frames, metadata, config) => {
  const findings = [];
  if (frames.length === 0) return findings;

  const actualAspect = metadata.width / metadata.height;
  if (config.checkAspect && config.expectedAspect && !ratioMatches(actualAspect, config.expectedAspect, config.aspectTolerance)) {
    findings.push({
      code: 'ASPECT_RATIO_MISMATCH',
      severity: 'error',
      message: `Input dimensions ${metadata.width}x${metadata.height} do not match expected aspect ${config.expectedAspect}.`,
      frames: [],
      details: {actualAspect, expectedAspect: aspectToNumber(config.expectedAspect), tolerance: config.aspectTolerance}
    });
  }

  if (config.checkPlatformMetadata) {
    if (config.acceptedAspects && !config.acceptedAspects.some((aspect) => ratioMatches(actualAspect, aspect, config.aspectTolerance))) {
      findings.push(platformFinding(
        config,
        'PLATFORM_ASPECT_UNSUPPORTED',
        `Input dimensions ${metadata.width}x${metadata.height} do not match an aspect supported by ${config.preset ?? 'the configured platform profile'}.`,
        {actualAspect, acceptedAspects: config.acceptedAspects, tolerance: config.aspectTolerance}
      ));
    }

    if ((config.minimumAspectRatio !== undefined && actualAspect < config.minimumAspectRatio - config.aspectTolerance) ||
        (config.maximumAspectRatio !== undefined && actualAspect > config.maximumAspectRatio + config.aspectTolerance)) {
      findings.push(platformFinding(
        config,
        'PLATFORM_ASPECT_OUT_OF_RANGE',
        `Aspect ratio ${actualAspect.toFixed(4)} is outside the permitted range for ${config.preset ?? 'the configured platform profile'}.`,
        {actualAspect, minimumAspectRatio: config.minimumAspectRatio, maximumAspectRatio: config.maximumAspectRatio}
      ));
    }

    if ((config.minimumWidth !== undefined && metadata.width < config.minimumWidth) ||
        (config.minimumHeight !== undefined && metadata.height < config.minimumHeight)) {
      findings.push(platformFinding(
        config,
        'PLATFORM_RESOLUTION_TOO_SMALL',
        `Resolution ${metadata.width}x${metadata.height} is below the minimum for ${config.preset ?? 'the configured platform profile'}.`,
        {width: metadata.width, height: metadata.height, minimumWidth: config.minimumWidth, minimumHeight: config.minimumHeight}
      ));
    }

    const isLandscape = metadata.width >= metadata.height;
    const maximumWidth = isLandscape ? config.landscapeMaximumWidth : config.portraitMaximumWidth;
    const maximumHeight = isLandscape ? config.landscapeMaximumHeight : config.portraitMaximumHeight;
    if ((maximumWidth !== undefined && metadata.width > maximumWidth) ||
        (maximumHeight !== undefined && metadata.height > maximumHeight)) {
      findings.push(platformFinding(
        config,
        'PLATFORM_RESOLUTION_TOO_LARGE',
        `Resolution ${metadata.width}x${metadata.height} exceeds the ${isLandscape ? 'landscape' : 'portrait'} limit for ${config.preset ?? 'the configured platform profile'}.`,
        {width: metadata.width, height: metadata.height, maximumWidth, maximumHeight}
      ));
    }

    if (config.allowedContainers && metadata.container) {
      const actualContainers = metadata.container.split(',').map((value) => value.trim().toLowerCase());
      if (!actualContainers.some((container) => config.allowedContainers.includes(container))) {
        findings.push(platformFinding(
          config,
          'PLATFORM_CONTAINER_UNSUPPORTED',
          `Container ${metadata.container} is not allowed by ${config.preset ?? 'the configured platform profile'}.`,
          {actual: metadata.container, allowed: config.allowedContainers}
        ));
      }
    }

    if (config.allowedVideoCodecs && metadata.codec && !config.allowedVideoCodecs.includes(metadata.codec.toLowerCase())) {
      findings.push(platformFinding(
        config,
        'PLATFORM_VIDEO_CODEC_UNSUPPORTED',
        `Video codec ${metadata.codec} is not allowed by ${config.preset ?? 'the configured platform profile'}.`,
        {actual: metadata.codec, allowed: config.allowedVideoCodecs}
      ));
    }

    if (config.allowedPixelFormats && metadata.pixelFormat && !config.allowedPixelFormats.includes(metadata.pixelFormat.toLowerCase())) {
      findings.push(platformFinding(
        config,
        'PLATFORM_PIXEL_FORMAT_UNSUPPORTED',
        `Pixel format ${metadata.pixelFormat} is not allowed by ${config.preset ?? 'the configured platform profile'}.`,
        {actual: metadata.pixelFormat, allowed: config.allowedPixelFormats}
      ));
    }

    if (config.allowedAudioCodecs && metadata.audioCodec && !config.allowedAudioCodecs.includes(metadata.audioCodec.toLowerCase())) {
      findings.push(platformFinding(
        config,
        'PLATFORM_AUDIO_CODEC_UNSUPPORTED',
        `Audio codec ${metadata.audioCodec} is not allowed by ${config.preset ?? 'the configured platform profile'}.`,
        {actual: metadata.audioCodec, allowed: config.allowedAudioCodecs}
      ));
    }

    if (config.maximumVideoBitRate !== undefined && metadata.videoBitRate !== undefined && metadata.videoBitRate > config.maximumVideoBitRate) {
      findings.push(platformFinding(
        config,
        'PLATFORM_BIT_RATE_TOO_HIGH',
        `Video bitrate ${metadata.videoBitRate} exceeds the limit for ${config.preset ?? 'the configured platform profile'}.`,
        {actualBitsPerSecond: metadata.videoBitRate, maximumBitsPerSecond: config.maximumVideoBitRate}
      ));
    }

    if (config.maximumFps !== undefined && metadata.fps > config.maximumFps + 0.001) {
      findings.push(platformFinding(
        config,
        'PLATFORM_FRAME_RATE_TOO_HIGH',
        `Frame rate ${metadata.fps.toFixed(3)} exceeds the ${config.maximumFps} fps limit for ${config.preset ?? 'the configured platform profile'}.`,
        {actual: metadata.fps, maximum: config.maximumFps}
      ));
    }

    if (config.maximumDurationSeconds !== undefined && metadata.durationSeconds !== undefined && metadata.durationSeconds > config.maximumDurationSeconds) {
      findings.push(platformFinding(
        config,
        'PLATFORM_DURATION_TOO_LONG',
        `Duration ${metadata.durationSeconds.toFixed(2)}s exceeds the ${config.maximumDurationSeconds}s limit for ${config.preset ?? 'the configured platform profile'}.`,
        {actualSeconds: metadata.durationSeconds, maximumSeconds: config.maximumDurationSeconds}
      ));
    }

    if (config.maximumFileSizeBytes !== undefined && metadata.fileSizeBytes !== undefined && metadata.fileSizeBytes > config.maximumFileSizeBytes) {
      findings.push(platformFinding(
        config,
        'PLATFORM_FILE_TOO_LARGE',
        `File size ${metadata.fileSizeBytes} bytes exceeds the limit for ${config.preset ?? 'the configured platform profile'}.`,
        {actualBytes: metadata.fileSizeBytes, maximumBytes: config.maximumFileSizeBytes}
      ));
    } else if (config.recommendedMaximumFileSizeBytes !== undefined && metadata.fileSizeBytes !== undefined && metadata.fileSizeBytes > config.recommendedMaximumFileSizeBytes) {
      findings.push(platformFinding(
        config,
        'PLATFORM_FILE_ABOVE_RECOMMENDATION',
        `File size ${metadata.fileSizeBytes} bytes is above the recommended maximum for ${config.preset ?? 'the configured platform profile'}.`,
        {actualBytes: metadata.fileSizeBytes, recommendedMaximumBytes: config.recommendedMaximumFileSizeBytes},
        'warning'
      ));
    }

  }

  const blankFrames = config.checkBlankFrames ? frames.filter((frame) => {
    const extreme = frame.meanLuminance <= config.blackLuminanceThreshold || frame.meanLuminance >= config.whiteLuminanceThreshold;
    return extreme && frame.luminanceStdDev <= config.blankStdDevThreshold;
  }) : [];
  if (blankFrames.length > 0) {
    findings.push({
      code: 'BLANK_FRAME',
      severity: 'error',
      message: `${blankFrames.length} blank or near-blank frame(s) detected.`,
      frames: blankFrames.map((frame) => frame.index),
      details: {
        blackThreshold: config.blackLuminanceThreshold,
        whiteThreshold: config.whiteLuminanceThreshold,
        standardDeviationThreshold: config.blankStdDevThreshold
      }
    });
  }

  const edgeFrames = config.checkEdgeActivity ? frames.filter((frame) => frame.edgeActivityRatio > config.maxEdgeActivityRatio) : [];
  if (edgeFrames.length > 0) {
    findings.push({
      code: 'EDGE_ACTIVITY',
      severity: 'warning',
      message: `${edgeFrames.length} frame(s) contain dense visual activity inside the outer ${Math.round(config.safeMarginRatio * 100)}% margin.`,
      frames: edgeFrames.map((frame) => frame.index),
      details: {maximumRatio: config.maxEdgeActivityRatio}
    });
  }

  if (config.checkFrozenRuns) {
    const minimumFrozenFrames = Math.max(2, Math.ceil(config.maxFrozenSeconds * config.fps));
    let runStart = 0;
    const closeRun = (endInclusive) => {
      const runLength = endInclusive - runStart + 1;
      if (runLength >= minimumFrozenFrames) {
        findings.push({
          code: 'FROZEN_RUN',
          severity: 'warning',
          message: `Frames ${runStart}-${endInclusive} remain visually unchanged for ${(runLength / config.fps).toFixed(2)} seconds.`,
          frames: Array.from({length: runLength}, (_, offset) => runStart + offset),
          details: {
            durationSeconds: runLength / config.fps,
            thresholdSeconds: config.maxFrozenSeconds,
            differenceThreshold: config.frozenDifferenceThreshold
          }
        });
      }
    };

    for (let index = 1; index < frames.length; index += 1) {
      const difference = normalizedFingerprintDifference(frames[index - 1].fingerprint, frames[index].fingerprint);
      if (difference > config.frozenDifferenceThreshold) {
        closeRun(index - 1);
        runStart = index;
      }
    }
    closeRun(frames.length - 1);
  }

  return findings;
};
