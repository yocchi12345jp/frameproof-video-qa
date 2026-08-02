/**
 * @typedef {'warning' | 'error'} Severity
 * @typedef {
 *   'ASPECT_RATIO_MISMATCH' |
 *   'BLANK_FRAME' |
 *   'FROZEN_RUN' |
 *   'EDGE_ACTIVITY' |
 *   'PLATFORM_ASPECT_UNSUPPORTED' |
 *   'PLATFORM_ASPECT_OUT_OF_RANGE' |
 *   'PLATFORM_RESOLUTION_TOO_SMALL' |
 *   'PLATFORM_RESOLUTION_TOO_LARGE' |
 *   'PLATFORM_CONTAINER_UNSUPPORTED' |
 *   'PLATFORM_VIDEO_CODEC_UNSUPPORTED' |
 *   'PLATFORM_PIXEL_FORMAT_UNSUPPORTED' |
 *   'PLATFORM_AUDIO_CODEC_UNSUPPORTED' |
 *   'PLATFORM_BIT_RATE_TOO_HIGH' |
 *   'PLATFORM_FRAME_RATE_TOO_HIGH' |
 *   'PLATFORM_DURATION_TOO_LONG' |
 *   'PLATFORM_FILE_TOO_LARGE' |
 *   'PLATFORM_FILE_ABOVE_RECOMMENDATION'
 * } FindingCode
 *
 * @typedef {Object} FrameStats
 * @property {number} index
 * @property {number} timestampSeconds
 * @property {number} meanLuminance
 * @property {number} luminanceStdDev
 * @property {number} edgeActivityRatio
 * @property {number[]} fingerprint
 *
 * @typedef {Object} Finding
 * @property {FindingCode} code
 * @property {Severity} severity
 * @property {string} message
 * @property {number[]} frames
 * @property {Record<string, unknown>=} details
 *
 * @typedef {Object} ScanConfig
 * @property {string=} preset
 * @property {number} fps
 * @property {string=} expectedAspect
 * @property {string[]=} acceptedAspects
 * @property {number=} minimumAspectRatio
 * @property {number=} maximumAspectRatio
 * @property {number=} minimumWidth
 * @property {number=} minimumHeight
 * @property {number=} landscapeMaximumWidth
 * @property {number=} landscapeMaximumHeight
 * @property {number=} portraitMaximumWidth
 * @property {number=} portraitMaximumHeight
 * @property {number} aspectTolerance
 * @property {number} maxFrozenSeconds
 * @property {number} frozenDifferenceThreshold
 * @property {number} safeMarginRatio
 * @property {number} maxEdgeActivityRatio
 * @property {number} blankStdDevThreshold
 * @property {number} blackLuminanceThreshold
 * @property {number} whiteLuminanceThreshold
 * @property {string[]=} allowedContainers
 * @property {string[]=} allowedVideoCodecs
 * @property {string[]=} allowedPixelFormats
 * @property {string[]=} allowedAudioCodecs
 * @property {number=} maximumFps
 * @property {number=} maximumVideoBitRate
 * @property {number=} maximumDurationSeconds
 * @property {number=} maximumFileSizeBytes
 * @property {number=} recommendedMaximumFileSizeBytes
 * @property {Severity} platformRuleSeverity
 * @property {number=} maxFrames
 * @property {boolean} checkBlankFrames
 * @property {boolean} checkFrozenRuns
 * @property {boolean} checkEdgeActivity
 * @property {boolean} checkAspect
 * @property {boolean} checkPlatformMetadata
 *
 * @typedef {Object} VideoMetadata
 * @property {number} width
 * @property {number} height
 * @property {number} fps
 * @property {number=} durationSeconds
 * @property {number=} frameCount
 * @property {string} codec
 * @property {string=} pixelFormat
 * @property {string=} profile
 * @property {number=} videoBitRate
 * @property {string=} container
 * @property {number=} fileSizeBytes
 * @property {string=} colorSpace
 * @property {string=} colorTransfer
 * @property {string=} colorPrimaries
 * @property {string=} audioCodec
 * @property {number=} audioChannels
 * @property {number=} audioSampleRate
 *
 * @typedef {Object} ScanReport
 * @property {'1.1'} schemaVersion
 * @property {string} generatedAt
 * @property {string} input
 * @property {VideoMetadata} metadata
 * @property {ScanConfig} config
 * @property {{frameCount: number, errors: number, warnings: number, passed: boolean}} summary
 * @property {FrameStats[]} frames
 * @property {Finding[]} findings
 */

export {};
