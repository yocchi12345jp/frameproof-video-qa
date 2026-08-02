export {scanInput} from './scan.js';
export {loadConfig, validateConfig, defaultConfig} from './config.js';
export {listPresets, getPreset} from './presets.js';
export {renderHtmlReport} from './report/html.js';
export {createStudioServer} from './studio-server.js';
export {createManifest, loadManifest, saveManifest, validateManifest, enrichFindingsWithManifest} from './manifest.js';
export {FrameProof, Region, ExpectMotion, ExpectText, ExpectVisible, ExpectAudio, ExpectSafeArea, beginManifestCollection, endManifestCollection, createManifestBuilder} from './assertions.js';
export {parseSrt, parseVtt, parseCaptionJson, loadCaptions, auditCaptions} from './captions.js';
export {analyzeAudio, auditAudio} from './audio.js';
export {listPlatformOverlays, getPlatformOverlay} from './platform-overlays.js';
export {createFixPacket, attachFixPackets} from './fix-packet.js';
export {VERSION} from './version.js';

export {compareReports, loadReport, loadAcceptances, validateAcceptances, findingFingerprint, findingIdentityKey, acceptanceTemplateForFinding, violationMetric} from './revision.js';
export {generateRevisionFilmstrip} from './filmstrip.js';
export {renderRevisionHtml} from './report/revision-html.js';
export {renderRevisionMarkdown} from './report/markdown.js';
export {renderSarif} from './report/sarif.js';
export {renderJunit} from './report/junit.js';

export {REPAIR_SCHEMA_VERSION, createRepairSession, validateRepairSession, loadRepairSession, saveRepairSession, buildRepairPrompt, mergeRepairRanges, getGitSnapshot, runRepairAgent, renderRepairPreviews, renderRepairFull, verifyRepair, approveRepair, createRepairCommands, runRepairLoop} from './repair.js';
export {renderRepairHtml} from './report/repair-html.js';
export {diagnoseEnvironment, formatDoctorText, detectPackageManager} from './doctor.js';
export {planProjectInitialization, initializeProject, loadProjectSettings, setBaseline, baselineStatus} from './onboarding.js';
export {verifyProject} from './workflow.js';

export {PREFLIGHT_SCHEMA_VERSION, runPreflight, formatPreflightText} from './preflight.js';
export {RENDER_RECEIPT_SCHEMA_VERSION, classifyRenderLog, runGuardedRender} from './render-health.js';
export {renderRenderReceiptHtml} from './report/render-receipt-html.js';
