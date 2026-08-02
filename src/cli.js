#!/usr/bin/env node
import {access, mkdir, readFile, writeFile} from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {loadConfig} from './config.js';
import {getToolVersion} from './ffmpeg.js';
import {listPresets} from './presets.js';
import {renderHtmlReport} from './report/html.js';
import {renderRevisionHtml} from './report/revision-html.js';
import {renderRevisionMarkdown} from './report/markdown.js';
import {renderSarif} from './report/sarif.js';
import {renderJunit} from './report/junit.js';
import {scanInput} from './scan.js';
import {createStudioServer} from './studio-server.js';
import {loadManifest} from './manifest.js';
import {acceptanceTemplateForFinding, compareReports, loadAcceptances, loadReport, validateAcceptances} from './revision.js';
import {generateRevisionFilmstrip} from './filmstrip.js';
import {VERSION} from './version.js';
import {approveRepair, createRepairCommands, createRepairSession, loadRepairSession, renderRepairFull, renderRepairPreviews, runRepairAgent, runRepairLoop, saveRepairSession, verifyRepair} from './repair.js';
import {renderRepairHtml} from './report/repair-html.js';
import {diagnoseEnvironment, formatDoctorText} from './doctor.js';
import {baselineStatus, initializeProject, setBaseline} from './onboarding.js';
import {verifyProject} from './workflow.js';
import {formatPreflightText, runPreflight} from './preflight.js';
import {runGuardedRender} from './render-health.js';
import {renderRenderReceiptHtml} from './report/render-receipt-html.js';

const usage = () => `FrameProof Video QA ${VERSION}

Source-aware verification, revision gates, and human-approved repair loops for programmatic video.

Usage:
  frameproof doctor [--json-output] [--project <directory>]
  frameproof init [--project <directory>] [--preset <name>] [--github] [--write-package]
  frameproof verify [video] [--project <directory>] [--artifacts-dir <directory>] [--no-baseline]
  frameproof baseline <set|status> [report.json] [options]
  frameproof preflight [--project <directory>] [options]
  frameproof render run --approve-render [--command <guarded-command>] [options]
  frameproof presets
  frameproof studio [--port 4318] [--no-open]
  frameproof manifest validate <manifest.json>
  frameproof scan <video-or-sequence-pattern> [options]
  frameproof compare <current-report.json> --baseline <baseline-report.json> [options]
  frameproof acceptance create <report.json> --finding <index> [options]
  frameproof repair create <report.json> [options]
  frameproof repair run <session.json> --approve-agent [options]
  frameproof repair preview <session.json> --approve-render [options]
  frameproof repair render <session.json> --approve-render [options]
  frameproof repair verify <session.json> --video <rendered.mp4> [options]
  frameproof repair approve <session.json> --owner <name> [options]
  frameproof repair loop <session.json> --approve-agent --approve-render [options]

Repair examples:
  frameproof repair create artifacts/current.json --project . --agent codex --output .frameproof/repairs/session.json
  frameproof repair run .frameproof/repairs/session.json --approve-agent
  frameproof repair preview .frameproof/repairs/session.json --approve-render
  frameproof repair render .frameproof/repairs/session.json --approve-render
  frameproof repair verify .frameproof/repairs/session.json --video out/current.mp4
  frameproof repair approve .frameproof/repairs/session.json --owner "reviewer"

Revision examples:
  frameproof scan current.mp4 --baseline baseline.json --acceptances .frameproof/acceptances.json --revision-html artifacts/revision.html
  frameproof compare current.json --baseline baseline.json --filmstrip-dir artifacts/filmstrip --html artifacts/revision.html --markdown artifacts/pr.md
  frameproof compare current.json --baseline baseline.json --sarif artifacts/frameproof.sarif --junit artifacts/frameproof.xml
  frameproof acceptance create current.json --finding 2 --reason "Approved logo hold" --output .frameproof/acceptances.json

Scan options:
  --config <path>                 --preset <name>
  --manifest <path>               --captions <path>
  --caption-language <auto|ja|en> --fps <number>
  --aspect <ratio>                --aspect-tolerance <number>
  --max-frozen-seconds <number>   --frozen-difference-threshold <number>
  --safe-margin <number>          --max-edge-activity <number>
  --blank-stddev-threshold <n>    --black-threshold <number>
  --white-threshold <number>      --max-frames <number>
  --maximum-analysis-frames <n>   --analysis-timeout-seconds <n>
  --json <path>                   --html <path>
  --fix-packets <path>            --audio
  --require-audio                 --check-silence
  --max-unexpected-silence <seconds>
  --no-captions --no-blank --no-frozen --no-edge --no-aspect-check --no-platform-check

Revision options:
  --baseline <report.json>        Baseline report
  --baseline-video <video>        Override baseline video for filmstrip
  --acceptances <file.json>       Reviewed findings to suppress from the revision gate
  --revision-json <path>          Revision comparison JSON
  --revision-html <path>          Revision comparison HTML
  --markdown <path>               GitHub-ready Markdown summary
  --sarif <path>                  SARIF 2.1.0 for GitHub code scanning
  --junit <path>                  JUnit XML for CI systems
  --filmstrip-dir <directory>     Extract changed baseline/current frames
  --include-accepted              Include accepted findings in SARIF/JUnit
  --fail-on-warning               Fail on current warnings or warning regressions

Repair options:
  --project <directory>           Project Git repository
  --agent <codex|claude|custom>   Agent adapter
  --agent-command <executable>    Custom agent executable
  --agent-args <json-array>       Extra/custom agent arguments
  --approve-agent                 Explicitly allow Agent execution
  --allow-dirty                   Allow a non-clean working tree
  --allow-file <csv>              Additional files the Agent may edit
  --allow-directory <csv>         Additional directories the Agent may edit
  --allow-unmapped                Explicitly permit an unmapped repair scope
  --include-warnings              Add warning findings to the repair scope
  --include-unchanged             Add unchanged revision findings
  --padding-frames <number>       Context around affected ranges (default 15)
  --render-command <template>     Partial preview command with {fromFrame}, {toFrame}, {output}
  --full-render-command <template> Full render command with {composition}, {output}
  --output-video <path>           Full render output
  --approve-render                Explicitly allow render commands
  --timeout-seconds <number>      Agent/render timeout
  --max-turns <number>            Claude non-interactive turn limit
  --max-iterations <number>       Maximum Agent/render/verify attempts
  --owner <name>                  Human approver
  --reason <text>                 Approval reason
  --receipt <path>                Human approval receipt output
  --session-html <path>           Repair session HTML output

Render health options:
  --command <guarded-command>      Command without shell operators; JSON argv arrays are accepted
  --approve-render                 Explicitly allow render execution
  --output-video <path>            Expected rendered video
  --timeout-seconds <number>       Maximum render duration
  --stall-seconds <number>         Warn after this much log silence
  --minimum-free-gb <number>       Preflight disk-space threshold
  --receipt <path>                 JSON render receipt
  --receipt-html <path>            HTML render receipt
  --verify-after-render            Run full FrameProof verification after render

Onboarding options:
  --project <directory>           Project root
  --project-type <type>           remotion or generic
  --artifacts-dir <directory>     Verification artifact directory
  --github                        Generate a GitHub Actions workflow
  --write-package                 Add FrameProof scripts and devDependency to package.json
  --force                         Replace existing generated files or baseline
  --dry-run                       Show files without writing them
  --no-baseline                   Verify without comparing the saved baseline
  --json-output                   Machine-readable doctor/status output
  --help --version`;

const numberOption = (value, name) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${name} requires a number`);
  return parsed;
};

const parseOptions = (args) => {
  const options = {failOnWarning: false, includeAccepted: false, approveAgent: false, approveRender: false, allowDirty: false, includeWarnings: false, includeUnchanged: false, useBaseline: true};
  const positional = [];
  const valueOptions = new Set([
    '--config', '--preset', '--manifest', '--captions', '--caption-language', '--fps', '--aspect', '--aspect-tolerance', '--max-frozen-seconds',
    '--frozen-difference-threshold', '--safe-margin', '--max-edge-activity', '--blank-stddev-threshold', '--black-threshold', '--white-threshold',
    '--max-frames', '--maximum-analysis-frames', '--analysis-timeout-seconds', '--json', '--html', '--fix-packets', '--port', '--max-unexpected-silence', '--baseline', '--baseline-report', '--baseline-video',
    '--acceptances', '--revision-json', '--revision-html', '--markdown', '--sarif', '--junit', '--filmstrip-dir', '--finding', '--reason', '--owner', '--output',
    '--project', '--agent', '--agent-command', '--agent-args', '--allow-file', '--padding-frames', '--render-command', '--full-render-command', '--output-video',
    '--timeout-seconds', '--max-turns', '--max-iterations', '--video', '--receipt', '--session-html', '--project-type', '--artifacts-dir', '--command', '--stall-seconds', '--minimum-free-gb', '--receipt-html'
  ]);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--fail-on-warning') { options.failOnWarning = true; continue; }
    if (arg === '--approve-agent') { options.approveAgent = true; continue; }
    if (arg === '--approve-render') { options.approveRender = true; continue; }
    if (arg === '--allow-dirty') { options.allowDirty = true; continue; }
    if (arg === '--include-warnings') { options.includeWarnings = true; continue; }
    if (arg === '--include-unchanged') { options.includeUnchanged = true; continue; }
    if (arg === '--include-accepted') { options.includeAccepted = true; continue; }
    if (arg === '--audio') { options.checkAudioIntegrity = true; continue; }
    if (arg === '--require-audio') { options.checkAudioIntegrity = true; options.requireAudioStream = true; continue; }
    if (arg === '--check-silence') { options.checkAudioIntegrity = true; options.checkUnexpectedSilence = true; continue; }
    if (arg === '--no-captions') { options.checkCaptions = false; continue; }
    if (arg === '--no-blank') { options.checkBlankFrames = false; continue; }
    if (arg === '--no-frozen') { options.checkFrozenRuns = false; continue; }
    if (arg === '--no-edge') { options.checkEdgeActivity = false; continue; }
    if (arg === '--no-aspect-check') { options.checkAspect = false; continue; }
    if (arg === '--no-platform-check') { options.checkPlatformMetadata = false; continue; }
    if (arg === '--help') { options.help = true; continue; }
    if (arg === '--version') { options.version = true; continue; }
    if (arg === '--no-open') { options.open = false; continue; }

    if (arg === '--github') { options.github = true; continue; }
    if (arg === '--write-package') { options.writePackage = true; continue; }
    if (arg === '--force') { options.force = true; continue; }
    if (arg === '--dry-run') { options.dryRun = true; continue; }
    if (arg === '--yes') { options.yes = true; continue; }
    if (arg === '--no-baseline') { options.useBaseline = false; continue; }
    if (arg === '--json-output') { options.jsonOutput = true; continue; }
    if (arg === '--verify-after-render') { options.verifyAfterRender = true; continue; }
    if (valueOptions.has(arg)) {
      const value = args[index + 1];
      if (value === undefined) throw new Error(`${arg} requires a value`);
      options[arg.slice(2)] = value;
      index += 1;
      continue;
    }
    if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    positional.push(arg);
  }
  return {options, positional};
};

const ensureParent = async (filePath) => mkdir(path.dirname(path.resolve(filePath)), {recursive: true});
const fileExists = async (filePath) => { try { await access(filePath, constants.F_OK); return true; } catch { return false; } };
const writeJson = async (filePath, value) => { await ensureParent(filePath); await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); };
const loadAcceptanceOrEmpty = async (filePath) => filePath ? loadAcceptances(path.resolve(filePath)) : validateAcceptances({schemaVersion: '1.0', acceptances: []});

const withRevision = (report, revision) => ({
  ...report,
  findings: revision.currentFindings,
  revision,
  summary: {
    ...report.summary,
    accepted: revision.summary.accepted,
    revisionBlocking: revision.summary.blocking,
    revisionPassed: revision.summary.passed
  }
});

const outputRevisionArtifacts = async ({report, baselineReport, revision, options}) => {
  let filmstrip;
  const revisionHtmlPath = options['revision-html'] ?? (options.command === 'compare' ? options.html : undefined);
  if (options['filmstrip-dir']) {
    filmstrip = await generateRevisionFilmstrip(revision, {
      currentReport: report,
      baselineReport,
      outputDir: path.resolve(options['filmstrip-dir']),
      baselineInput: options['baseline-video'] ? path.resolve(options['baseline-video']) : baselineReport.input
    });
    if (revisionHtmlPath) {
      const prefix = path.relative(path.dirname(path.resolve(revisionHtmlPath)), filmstrip.outputDir).replaceAll('\\', '/') || '.';
      filmstrip = {...filmstrip, assets: filmstrip.assets.map((asset) => ({...asset, current: asset.current ? `${prefix}/${asset.current}` : undefined, baseline: asset.baseline ? `${prefix}/${asset.baseline}` : undefined}))};
    }
  }
  const revisionJsonPath = options['revision-json'] ?? (options.command === 'compare' ? options.json : undefined);
  if (revisionJsonPath) await writeJson(revisionJsonPath, revision);
  if (revisionHtmlPath) { await ensureParent(revisionHtmlPath); await writeFile(revisionHtmlPath, renderRevisionHtml(revision, {currentReport: report, baselineReport, filmstrip}), 'utf8'); }
  if (options.markdown) { await ensureParent(options.markdown); await writeFile(options.markdown, renderRevisionMarkdown(revision), 'utf8'); }
  if (options.sarif) await writeJson(options.sarif, renderSarif(report, {includeAccepted: options.includeAccepted}));
  if (options.junit) { await ensureParent(options.junit); await writeFile(options.junit, renderJunit(report, {includeAccepted: options.includeAccepted}), 'utf8'); }
  return {filmstrip};
};

const printRevision = (revision) => {
  const s = revision.summary;
  console.log(`Revision: new ${s.new} | regressed ${s.regressed} | improved ${s.improved} | resolved ${s.resolved} | accepted ${s.accepted} | unchanged ${s.unchanged}`);
  console.log(`Revision gate: ${s.passed ? 'PASSED' : 'FAILED'} (${s.blocking} blocking)`);
};

const runCompare = async (rest) => {
  const {options, positional} = parseOptions(rest);
  options.command = 'compare';
  const currentPath = positional[0];
  const baselinePath = options.baseline ?? options['baseline-report'];
  if (!currentPath || !baselinePath) throw new Error('Usage: frameproof compare <current-report.json> --baseline <baseline-report.json>');
  const [current, baseline, acceptances] = await Promise.all([loadReport(path.resolve(currentPath)), loadReport(path.resolve(baselinePath)), loadAcceptanceOrEmpty(options.acceptances)]);
  const revision = compareReports(current, baseline, acceptances);
  const report = withRevision(current, revision);
  await outputRevisionArtifacts({report, baselineReport: baseline, revision, options});
  printRevision(revision);
  process.exitCode = !revision.summary.passed || (options.failOnWarning && revision.summary.warningRegressions > 0) ? 1 : 0;
};

const runAcceptance = async (rest) => {
  const [subcommand, ...tail] = rest;
  if (subcommand !== 'create') throw new Error('Usage: frameproof acceptance create <report.json> --finding <index>');
  const {options, positional} = parseOptions(tail);
  const reportPath = positional[0];
  if (!reportPath || options.finding === undefined) throw new Error('acceptance create requires a report and --finding index');
  const report = await loadReport(path.resolve(reportPath));
  const index = numberOption(options.finding, '--finding');
  const finding = report.findings?.[index];
  if (!finding) throw new Error(`Finding index ${index} does not exist`);
  const output = options.output ? path.resolve(options.output) : undefined;
  let file = {schemaVersion: '1.0', acceptances: []};
  if (output && await fileExists(output)) file = validateAcceptances(JSON.parse(await readFile(output, 'utf8')));
  const acceptance = acceptanceTemplateForFinding(finding, report, {reason: options.reason ?? 'Reviewed and accepted', owner: options.owner});
  file.acceptances.push(acceptance);
  if (output) { await writeJson(output, file); console.log(`Acceptance added to ${output}`); }
  else console.log(JSON.stringify({schemaVersion: '1.0', acceptances: [acceptance]}, null, 2));
};


const parseJsonArrayOption = (value, name) => {
  if (!value) return [];
  let parsed;
  try { parsed = JSON.parse(value); } catch { throw new Error(`${name} must be a JSON array`); }
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) throw new Error(`${name} must be a JSON array of strings`);
  return parsed;
};

const writeRepairArtifacts = async (sessionPath, session, options = {}) => {
  await saveRepairSession(sessionPath, session);
  if (options['session-html']) {
    await ensureParent(options['session-html']);
    await writeFile(options['session-html'], renderRepairHtml(session), 'utf8');
  }
};

const runRepair = async (rest) => {
  const [subcommand, ...tail] = rest;
  const {options, positional} = parseOptions(tail);
  if (!subcommand) throw new Error('Usage: frameproof repair <create|run|preview|render|verify|approve|loop> ...');
  const timeoutMs = options['timeout-seconds'] === undefined ? undefined : numberOption(options['timeout-seconds'], '--timeout-seconds') * 1000;

  if (subcommand === 'create') {
    const reportPath = positional[0];
    if (!reportPath) throw new Error('repair create requires a FrameProof JSON report');
    const report = await loadReport(path.resolve(reportPath));
    const output = path.resolve(options.output ?? path.join(options.project ?? report.manifest?.projectRoot ?? process.cwd(), '.frameproof', 'repairs', 'session.json'));
    const session = await createRepairSession(report, {
      reportPath,
      projectRoot: options.project,
      agent: options.agent ?? 'codex',
      includeWarnings: options.includeWarnings,
      includeUnchanged: options.includeUnchanged,
      paddingFrames: options['padding-frames'] === undefined ? undefined : numberOption(options['padding-frames'], '--padding-frames'),
      allowedFiles: [options['allow-file'], options['allow-directory']].filter(Boolean).flatMap((value) => value.split(',').map((item) => item.trim()).filter(Boolean)),
      renderCommand: options['render-command'],
      fullRenderCommand: options['full-render-command'],
      outputVideo: options['output-video']
    });
    await writeRepairArtifacts(output, session, options);
    const promptPath = path.join(path.dirname(output), 'prompt.md');
    await ensureParent(promptPath); await writeFile(promptPath, session.prompt, 'utf8');
    console.log(`Repair session created: ${output}`);
    console.log(`Targets: ${session.targets.length} | Ranges: ${session.ranges.length} | Agent: ${session.agent.name}`);
    console.log(JSON.stringify(createRepairCommands(session, output), null, 2));
    return;
  }

  const sessionPath = positional[0];
  if (!sessionPath) throw new Error(`repair ${subcommand} requires a session JSON path`);
  const resolvedSessionPath = path.resolve(sessionPath);
  const session = await loadRepairSession(resolvedSessionPath);
  if (options.agent) session.agent.name = options.agent;
  if (options['render-command']) session.commands.renderPreview = options['render-command'];
  if (options['full-render-command']) session.commands.renderFull = options['full-render-command'];
  if (options['output-video']) session.outputVideo = path.resolve(session.projectRoot, options['output-video']);

  if (subcommand === 'loop') {
    if (options['max-iterations'] !== undefined) session.policy.maxIterations = Math.max(1, Math.floor(numberOption(options['max-iterations'], '--max-iterations')));
    const result = await runRepairLoop(session, {
      approveAgent: options.approveAgent, approveRender: options.approveRender, allowDirty: options.allowDirty, allowUnmapped: options.allowUnmapped,
      agentCommand: options['agent-command'], agentArgs: parseJsonArrayOption(options['agent-args'], '--agent-args'),
      maxTurns: options['max-turns'] === undefined ? undefined : numberOption(options['max-turns'], '--max-turns'), timeoutMs,
      previewCommand: options['render-command'], fullRenderCommand: options['full-render-command'], outputVideo: options['output-video'],
      reportPath: options.baseline ?? session.reportPath, configPath: options.config, manifestPath: options.manifest, captionsPath: options.captions
    });
    await writeRepairArtifacts(resolvedSessionPath, result.session, options);
    console.log(`Repair loop: ${result.passed ? 'PASSED' : 'STOPPED'} at ${result.stoppedAt}`);
    console.log(`State: ${result.session.state}`);
    process.exitCode = result.passed ? 0 : 1;
    return;
  }

  if (subcommand === 'run') {
    const result = await runRepairAgent(session, {
      approve: options.approveAgent,
      allowDirty: options.allowDirty,
      allowUnmapped: options.allowUnmapped,
      agentCommand: options['agent-command'],
      agentArgs: parseJsonArrayOption(options['agent-args'], '--agent-args'),
      maxTurns: options['max-turns'] === undefined ? undefined : numberOption(options['max-turns'], '--max-turns'),
      timeoutMs
    });
    await writeRepairArtifacts(resolvedSessionPath, result.session, options);
    console.log(`Agent state: ${result.session.state}`);
    console.log(`Changed files: ${result.attempt.git.changedFiles.join(', ') || 'none'}`);
    if (result.attempt.git.unexpectedFiles.length) console.log(`Unexpected files: ${result.attempt.git.unexpectedFiles.join(', ')}`);
    process.exitCode = ['agent_completed'].includes(result.session.state) ? 0 : 1;
    return;
  }

  if (subcommand === 'preview') {
    const result = await renderRepairPreviews(session, {approve: options.approveRender, commandTemplate: options['render-command'], timeoutMs});
    await writeRepairArtifacts(resolvedSessionPath, result.session, options);
    console.log(`Preview state: ${result.session.state}`);
    for (const preview of result.results) console.log(`${preview.code === 0 ? 'OK' : 'FAILED'} ${preview.range.from}-${preview.range.to}: ${preview.output}`);
    process.exitCode = result.session.state === 'preview_ready' ? 0 : 1;
    return;
  }

  if (subcommand === 'render') {
    const result = await renderRepairFull(session, {approve: options.approveRender, commandTemplate: options['full-render-command'], outputVideo: options['output-video'], timeoutMs});
    await writeRepairArtifacts(resolvedSessionPath, result.session, options);
    console.log(`Render state: ${result.session.state}`);
    console.log(`Output: ${result.output}`);
    process.exitCode = result.session.state === 'rendered' ? 0 : 1;
    return;
  }

  if (subcommand === 'verify') {
    const result = await verifyRepair(session, {video: options.video ?? options['output-video'], reportPath: options.baseline ?? session.reportPath, configPath: options.config, manifestPath: options.manifest, captionsPath: options.captions});
    await writeRepairArtifacts(resolvedSessionPath, result.session, options);
    console.log(`Repair verification: ${result.session.verification.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`Unresolved targets: ${result.session.verification.unresolvedTargetCount} | New/regressed errors: ${result.session.verification.newOrRegressedErrorCount}`);
    process.exitCode = result.session.verification.passed ? 0 : 1;
    return;
  }

  if (subcommand === 'approve') {
    const result = await approveRepair(session, {owner: options.owner, reason: options.reason});
    await writeRepairArtifacts(resolvedSessionPath, result.session, options);
    const receiptPath = path.resolve(options.receipt ?? path.join(path.dirname(resolvedSessionPath), 'approval-receipt.json'));
    await writeJson(receiptPath, result.receipt);
    console.log(`Repair approved by ${result.receipt.owner}`);
    console.log(`Receipt: ${receiptPath}`);
    return;
  }

  throw new Error(`Unknown repair subcommand: ${subcommand}`);
};

const runScan = async (rest) => {
  const {options, positional} = parseOptions(rest);
  options.command = 'scan';
  if (options.help) { console.log(usage()); return; }
  if (options.version) { console.log(VERSION); return; }
  const input = positional[0];
  if (!input) throw new Error('scan requires a video path or FFmpeg sequence pattern');
  const config = await loadConfig(options.config, {
    preset: options.preset,
    fps: options.fps === undefined ? undefined : numberOption(options.fps, '--fps'), expectedAspect: options.aspect,
    aspectTolerance: options['aspect-tolerance'] === undefined ? undefined : numberOption(options['aspect-tolerance'], '--aspect-tolerance'),
    maxFrozenSeconds: options['max-frozen-seconds'] === undefined ? undefined : numberOption(options['max-frozen-seconds'], '--max-frozen-seconds'),
    frozenDifferenceThreshold: options['frozen-difference-threshold'] === undefined ? undefined : numberOption(options['frozen-difference-threshold'], '--frozen-difference-threshold'),
    safeMarginRatio: options['safe-margin'] === undefined ? undefined : numberOption(options['safe-margin'], '--safe-margin'),
    maxEdgeActivityRatio: options['max-edge-activity'] === undefined ? undefined : numberOption(options['max-edge-activity'], '--max-edge-activity'),
    blankStdDevThreshold: options['blank-stddev-threshold'] === undefined ? undefined : numberOption(options['blank-stddev-threshold'], '--blank-stddev-threshold'),
    blackLuminanceThreshold: options['black-threshold'] === undefined ? undefined : numberOption(options['black-threshold'], '--black-threshold'),
    whiteLuminanceThreshold: options['white-threshold'] === undefined ? undefined : numberOption(options['white-threshold'], '--white-threshold'),
    maxFrames: options['max-frames'] === undefined ? undefined : numberOption(options['max-frames'], '--max-frames'),
    maximumAnalysisFrames: options['maximum-analysis-frames'] === undefined ? undefined : numberOption(options['maximum-analysis-frames'], '--maximum-analysis-frames'),
    analysisTimeoutMs: options['analysis-timeout-seconds'] === undefined ? undefined : numberOption(options['analysis-timeout-seconds'], '--analysis-timeout-seconds') * 1000,
    captionLanguage: options['caption-language'], checkCaptions: options.checkCaptions, checkAudioIntegrity: options.checkAudioIntegrity,
    requireAudioStream: options.requireAudioStream, checkUnexpectedSilence: options.checkUnexpectedSilence,
    maxUnexpectedSilenceSeconds: options['max-unexpected-silence'] === undefined ? undefined : numberOption(options['max-unexpected-silence'], '--max-unexpected-silence'),
    checkBlankFrames: options.checkBlankFrames, checkFrozenRuns: options.checkFrozenRuns, checkEdgeActivity: options.checkEdgeActivity,
    checkAspect: options.checkAspect, checkPlatformMetadata: options.checkPlatformMetadata
  });
  const manifestPath = options.manifest ? path.resolve(options.manifest) : undefined;
  const captionsPath = options.captions ? path.resolve(options.captions) : undefined;
  let report = await scanInput(input, config, {manifestPath, captionsPath});
  let revision;
  let baselineReport;
  const baselinePath = options.baseline ?? options['baseline-report'];
  if (baselinePath) {
    [baselineReport] = await Promise.all([loadReport(path.resolve(baselinePath))]);
    const acceptances = await loadAcceptanceOrEmpty(options.acceptances);
    revision = compareReports(report, baselineReport, acceptances);
    report = withRevision(report, revision);
  }
  if (options.json) await writeJson(options.json, report);
  if (options.html) { await ensureParent(options.html); await writeFile(options.html, renderHtmlReport(report), 'utf8'); }
  if (options['fix-packets']) await writeJson(options['fix-packets'], {schemaVersion: '1.0', generatedAt: report.generatedAt, input: report.input, fixPackets: report.fixPackets});
  if (revision) await outputRevisionArtifacts({report, baselineReport, revision, options});
  else {
    if (options.sarif) await writeJson(options.sarif, renderSarif(report, {includeAccepted: options.includeAccepted}));
    if (options.junit) { await ensureParent(options.junit); await writeFile(options.junit, renderJunit(report, {includeAccepted: options.includeAccepted}), 'utf8'); }
  }
  console.log(`FrameProof scanned ${report.summary.frameCount} frame(s) at ${Number(report.metadata.fps.toFixed(3))} fps.`);
  console.log(`Input: ${report.metadata.width}x${report.metadata.height} ${report.metadata.codec}${report.metadata.pixelFormat ? `/${report.metadata.pixelFormat}` : ''}`);
  if (config.preset) console.log(`Preset: ${config.preset}`);
  if (report.context.compositionId) console.log(`Composition: ${report.context.compositionId}`);
  console.log(`Errors: ${report.summary.errors} | Warnings: ${report.summary.warnings}`);
  for (const finding of report.findings) {
    const source = finding.source?.file ? ` (${finding.source.file}${finding.source.line ? `:${finding.source.line}` : ''})` : '';
    const status = finding.revision?.status ? ` [${finding.revision.status}]` : '';
    console.log(`[${finding.severity.toUpperCase()}]${status} ${finding.code}: ${finding.message}${source}`);
  }
  if (revision) printRevision(revision);
  process.exitCode = revision
    ? (!revision.summary.passed || (options.failOnWarning && revision.summary.warningRegressions > 0) ? 1 : 0)
    : (report.summary.errors > 0 || (options.failOnWarning && report.summary.warnings > 0) ? 1 : 0);
};


const runDoctor = async (rest) => {
  const {options} = parseOptions(rest);
  const diagnosis = await diagnoseEnvironment({projectRoot: options.project ?? process.cwd()});
  console.log(options.jsonOutput ? JSON.stringify(diagnosis, null, 2) : formatDoctorText(diagnosis));
  process.exitCode = diagnosis.ready ? 0 : 1;
};

const runInit = async (rest) => {
  const {options} = parseOptions(rest);
  const result = await initializeProject({
    projectRoot: options.project ?? process.cwd(), projectType: options['project-type'], video: options.video,
    preset: options.preset, artifactsDir: options['artifacts-dir'], github: options.github, writePackage: options.writePackage,
    force: options.force, dryRun: options.dryRun
  });
  console.log(`${result.dryRun ? 'Initialization plan' : 'FrameProof initialized'}: ${result.root}`);
  console.log(`Project type: ${result.projectType} | Package manager: ${result.packageManager}`);
  for (const file of result.created) console.log(`${result.dryRun ? 'WOULD WRITE' : 'WROTE'} ${file}`);
  for (const file of result.skipped) console.log(`SKIPPED ${file} (already exists; use --force to replace)`);
  console.log('Next: render a video, then run frameproof verify.');
};

const runVerify = async (rest) => {
  const {options, positional} = parseOptions(rest);
  const result = await verifyProject({
    projectRoot: options.project ?? process.cwd(), input: positional[0], artifactsDir: options['artifacts-dir'],
    useBaseline: options.useBaseline, failOnWarning: options.failOnWarning, preset: options.preset
  });
  console.log(`FrameProof verification: ${result.passed ? 'PASSED' : 'FAILED'}`);
  console.log(`Video: ${result.summary.video}`);
  console.log(`Errors: ${result.report.summary.errors} | Warnings: ${result.report.summary.warnings}`);
  if (result.revision) console.log(`Revision: new ${result.revision.summary.new}, regressed ${result.revision.summary.regressed}, resolved ${result.revision.summary.resolved}, accepted ${result.revision.summary.accepted}`);
  console.log(`Artifacts: ${result.outputRoot}`);
  process.exitCode = result.passed ? 0 : 1;
};

const runBaseline = async (rest) => {
  const [subcommand, ...tail] = rest;
  const {options, positional} = parseOptions(tail);
  if (subcommand === 'set') {
    const reportPath = positional[0];
    if (!reportPath) throw new Error('Usage: frameproof baseline set <report.json> [--project <directory>] [--force]');
    const result = await setBaseline(reportPath, {projectRoot: options.project ?? process.cwd(), output: options.output, force: options.force});
    console.log(`Baseline set: ${result.target}`);
    console.log(`SHA-256: ${result.receipt.sha256}`);
    console.log(`Receipt: ${result.receiptPath}`);
    return;
  }
  if (subcommand === 'status') {
    const result = await baselineStatus({projectRoot: options.project ?? process.cwd()});
    if (options.jsonOutput) { console.log(JSON.stringify(result, null, 2)); return; }
    if (!result.exists) { console.log(`No baseline at ${result.target}`); process.exitCode = 1; return; }
    console.log(`Baseline: ${result.target}`);
    console.log(`Input: ${result.input}`);
    console.log(`Generated: ${result.generatedAt}`);
    console.log(`Errors: ${result.summary.errors} | Warnings: ${result.summary.warnings}`);
    console.log(`SHA-256: ${result.sha256}`);
    return;
  }
  throw new Error('Usage: frameproof baseline <set|status> ...');
};


const runPreflightCommand = async (rest) => {
  const {options} = parseOptions(rest);
  const minimumFreeBytes = options['minimum-free-gb'] === undefined ? undefined : numberOption(options['minimum-free-gb'], '--minimum-free-gb') * 1024 ** 3;
  const result = await runPreflight({
    projectRoot: options.project ?? process.cwd(),
    minimumFreeBytes,
    renderCommand: options.command,
    outputVideo: options['output-video']
  });
  if (options.json) await writeJson(options.json, result);
  if (options.html) { await ensureParent(options.html); await writeFile(options.html, renderRenderReceiptHtml({generatedAt:result.generatedAt, command:result.renderCommand, preflight:result, process:{}, output:{}, verification:{performed:false}, advisor:{findings:[]}, result:{passed:result.ready, blocked:!result.ready}}), 'utf8'); }
  console.log(options.jsonOutput ? JSON.stringify(result, null, 2) : formatPreflightText(result));
  process.exitCode = result.ready ? 0 : 1;
};

const runRenderCommand = async (rest) => {
  const [subcommand, ...tail] = rest;
  if (subcommand !== 'run') throw new Error('Usage: frameproof render run --approve-render [--command <shell>]');
  const {options} = parseOptions(tail);
  const timeoutMs = options['timeout-seconds'] === undefined ? undefined : numberOption(options['timeout-seconds'], '--timeout-seconds') * 1000;
  const stallMs = options['stall-seconds'] === undefined ? undefined : numberOption(options['stall-seconds'], '--stall-seconds') * 1000;
  const minimumFreeBytes = options['minimum-free-gb'] === undefined ? undefined : numberOption(options['minimum-free-gb'], '--minimum-free-gb') * 1024 ** 3;
  const result = await runGuardedRender({
    projectRoot: options.project ?? process.cwd(), command: options.command, approveRender: options.approveRender,
    outputVideo: options['output-video'], timeoutMs, stallMs, minimumFreeBytes,
    receiptPath: options.receipt, receiptHtmlPath: options['receipt-html'], verifyAfterRender: options.verifyAfterRender,
    failOnWarning: options.failOnWarning
  });
  const receipt = result.receipt;
  console.log(`Render: ${receipt.result.passed ? 'PASSED' : receipt.result.blocked ? 'BLOCKED' : 'FAILED'}`);
  console.log(`Receipt: ${result.receiptPath}`);
  if (result.receiptHtmlPath) console.log(`HTML: ${result.receiptHtmlPath}`);
  for (const finding of receipt.advisor?.findings ?? []) console.log(`[${finding.severity.toUpperCase()}] ${finding.category}: ${finding.evidence}`);
  process.exitCode = receipt.result.passed ? 0 : 1;
};

const main = async () => {
  const [command, ...rest] = process.argv.slice(2);
  if (!command || command === '--help' || command === '-h') { console.log(usage()); return; }
  if (command === '--version' || command === '-v') { console.log(VERSION); return; }
  if (command === 'doctor') return runDoctor(rest);
  if (command === 'init') return runInit(rest);
  if (command === 'verify') return runVerify(rest);
  if (command === 'baseline') return runBaseline(rest);
  if (command === 'preflight') return runPreflightCommand(rest);
  if (command === 'render') return runRenderCommand(rest);
  if (command === 'presets') { for (const preset of listPresets()) console.log(`${preset.name}\t${preset.description}`); return; }
  if (command === 'studio') {
    const {options} = parseOptions(rest); const studioPort = options.port === undefined ? 4318 : numberOption(options.port, '--port');
    const studio = await createStudioServer({port: studioPort, open: options.open !== false});
    console.log(`FrameProof Studio ${VERSION} is running at ${studio.url}`); console.log(`Reports: ${studio.reportDir}`); return;
  }
  if (command === 'manifest') {
    const [subcommand, manifestPath] = rest;
    if (subcommand !== 'validate' || !manifestPath) throw new Error('Usage: frameproof manifest validate <manifest.json>');
    const manifest = await loadManifest(manifestPath);
    console.log(`Manifest is valid: ${manifest.compositionId} · ${manifest.durationInFrames} frames · ${manifest.assertions.length} assertions`); return;
  }
  if (command === 'compare') return runCompare(rest);
  if (command === 'acceptance') return runAcceptance(rest);
  if (command === 'repair') return runRepair(rest);
  if (command === 'scan') return runScan(rest);
  throw new Error(`Unknown command: ${command}`);
};

main().catch((error) => { console.error(`FrameProof error: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 2; });
