import {createHash, randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {access, mkdir, readFile, stat, writeFile} from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {scanInput} from './scan.js';
import {compareReports, findingFingerprint, findingIdentityKey, loadReport, validateAcceptances} from './revision.js';
import {loadConfig} from './config.js';
import {VERSION} from './version.js';
import {displayCommandSpec, resolveCommandSpec} from './command-spec.js';
import {assessOutputFreshness, snapshotOutput} from './render-health.js';

export const REPAIR_SCHEMA_VERSION = '1.0';
const DEFAULT_PADDING_FRAMES = 15;
const DEFAULT_TIMEOUT_MS = 20 * 60 * 1000;
const REPAIRABLE_STATUSES = new Set(['new', 'regressed']);

const now = () => new Date().toISOString();
const normalizePath = (value) => String(value ?? '').replaceAll('\\', '/');
const fileExists = async (filePath) => { try { await access(filePath, constants.F_OK); return true; } catch { return false; } };
const ensureParent = async (filePath) => mkdir(path.dirname(path.resolve(filePath)), {recursive: true});
const writeJson = async (filePath, value) => { await ensureParent(filePath); await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); };
const truncateLog = (value, maximum = 64 * 1024) => {
  const text = String(value ?? '');
  return text.length <= maximum ? text : `[truncated ${text.length - maximum} characters]\n${text.slice(-maximum)}`;
};

const runProcess = ({command, args = [], cwd, input, env, inheritEnv = true, timeoutMs = DEFAULT_TIMEOUT_MS}) => new Promise((resolve, reject) => {
  const child = spawn(command, args, {
    cwd,
    env: inheritEnv ? {...process.env, ...env} : {...env},
    shell: false,
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  let stdout = '';
  let stderr = '';
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    child.kill('SIGTERM');
    setTimeout(() => child.kill('SIGKILL'), 3000).unref();
  }, timeoutMs);
  child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  child.on('error', (error) => { clearTimeout(timeout); reject(error); });
  child.on('close', (code, signal) => {
    clearTimeout(timeout);
    resolve({command, args, cwd, code: code ?? (timedOut ? 124 : 1), signal, stdout, stderr, timedOut});
  });
  if (input !== undefined) child.stdin.write(input);
  child.stdin.end();
});

const runGit = async (projectRoot, args) => runProcess({command: 'git', args, cwd: projectRoot, timeoutMs: 60_000});

export const getGitSnapshot = async (projectRoot) => {
  const rootResult = await runGit(projectRoot, ['rev-parse', '--show-toplevel']);
  if (rootResult.code !== 0) return {isRepository: false, projectRoot: path.resolve(projectRoot), status: [], changedFiles: [], diff: ''};
  const gitRoot = rootResult.stdout.trim();
  const [statusResult, diffResult, headResult] = await Promise.all([
    runGit(gitRoot, ['status', '--porcelain=v1', '--untracked-files=all']),
    runGit(gitRoot, ['diff', '--binary', '--no-ext-diff']),
    runGit(gitRoot, ['rev-parse', 'HEAD'])
  ]);
  const rawStatus = statusResult.stdout.split(/\r?\n/).filter(Boolean);
  const parsedStatus = rawStatus.map((line) => ({line, file: normalizePath(line.slice(3).trim().replace(/^"|"$/g, ''))}));
  const statusEntries = parsedStatus.filter(({file}) => file !== '.frameproof' && !file.startsWith('.frameproof/'));
  const status = statusEntries.map(({line}) => line);
  const changedFiles = statusEntries.map(({file}) => file);
  const fileHashes = {};
  for (const file of changedFiles) {
    const absolute = path.resolve(gitRoot, file);
    try {
      const metadata = await stat(absolute);
      if (metadata.isFile()) fileHashes[file] = createHash('sha256').update(await readFile(absolute)).digest('hex');
      else fileHashes[file] = `<${metadata.isDirectory() ? 'directory' : 'non-file'}>`;
    } catch {
      fileHashes[file] = '<deleted-or-unreadable>';
    }
  }
  const evidence = `${diffResult.stdout}\n--FRAMEPROOF-FILE-HASHES--\n${Object.entries(fileHashes).sort(([a], [b]) => a.localeCompare(b)).map(([file, hash]) => `${file} ${hash}`).join('\n')}`;
  return {
    isRepository: true,
    projectRoot: gitRoot,
    head: headResult.code === 0 ? headResult.stdout.trim() : undefined,
    clean: status.length === 0,
    status,
    changedFiles,
    fileHashes,
    diff: diffResult.stdout,
    diffSha256: createHash('sha256').update(evidence).digest('hex')
  };
};

const sourceFilesForFinding = (finding) => {
  const files = new Set();
  if (finding.source?.file) files.add(normalizePath(finding.source.file));
  for (const context of finding.contexts ?? []) if (context.source?.file) files.add(normalizePath(context.source.file));
  return [...files];
};

const defaultSelectedFindings = (report, {includeWarnings = false, includeUnchanged = false} = {}) => (report.findings ?? []).filter((finding) => {
  if (!includeWarnings && finding.severity !== 'error') return false;
  const status = finding.revision?.status;
  if (!status) return finding.severity === 'error' || includeWarnings;
  if (REPAIRABLE_STATUSES.has(status)) return true;
  return includeUnchanged && status === 'unchanged';
});

const rangeForFinding = (finding) => {
  const frames = finding.frames ?? [];
  if (frames.length === 0) return undefined;
  return {from: Math.min(...frames), to: Math.max(...frames)};
};

export const mergeRepairRanges = (findings, {paddingFrames = DEFAULT_PADDING_FRAMES, durationInFrames} = {}) => {
  const raw = findings.map((finding) => ({finding, range: rangeForFinding(finding)})).filter((entry) => entry.range).map(({finding, range}) => ({
    from: Math.max(0, range.from - paddingFrames),
    to: durationInFrames ? Math.min(durationInFrames - 1, range.to + paddingFrames) : range.to + paddingFrames,
    findingIds: [finding.fixPacketId ?? finding.code],
    sourceFiles: sourceFilesForFinding(finding)
  })).sort((a, b) => a.from - b.from || a.to - b.to);
  const merged = [];
  for (const range of raw) {
    const previous = merged.at(-1);
    if (previous && range.from <= previous.to + 1) {
      previous.to = Math.max(previous.to, range.to);
      previous.findingIds = [...new Set([...previous.findingIds, ...range.findingIds])];
      previous.sourceFiles = [...new Set([...previous.sourceFiles, ...range.sourceFiles])];
    } else merged.push({...range});
  }
  return merged;
};

const sessionId = () => `repair-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}-${randomUUID().slice(0, 8)}`;

const fixPacketFor = (finding, report) => (report.fixPackets ?? []).find((packet) => packet.id === finding.fixPacketId) ?? {
  id: finding.fixPacketId ?? `${finding.code}:unknown`,
  ruleId: finding.code,
  severity: finding.severity,
  message: finding.message,
  source: finding.source,
  frames: rangeForFinding(finding),
  expected: finding.details?.expected,
  actual: finding.details?.actual
};

export const buildRepairPrompt = (session, report) => {
  const packetText = session.targets.map((target, index) => {
    const packet = target.fixPacket;
    return [
      `### ${index + 1}. ${packet.ruleId} (${packet.severity})`,
      packet.message,
      packet.source?.file ? `- Source: ${packet.source.file}${packet.source.line ? `:${packet.source.line}` : ''}` : '- Source: not mapped',
      packet.frames ? `- Frames: ${packet.frames.from}-${packet.frames.to}` : '- Frames: global',
      packet.expected ? `- Expected: ${JSON.stringify(packet.expected)}` : undefined,
      packet.actual ? `- Actual: ${JSON.stringify(packet.actual)}` : undefined,
      `- Suggested actions: ${(packet.suggestedActions ?? []).join('; ') || 'Inspect and apply the smallest safe change.'}`
    ].filter(Boolean).join('\n');
  }).join('\n\n');
  return `# FrameProof repair task\n\nYou are repairing a programmatic video project. Work only inside the project directory. Read AGENTS.md and CLAUDE.md when present.\n\n## Goal\nResolve the selected FrameProof findings with the smallest maintainable source change. Preserve unrelated behavior and visual design. Do not commit, push, publish, install global packages, or change credentials.\n\n## Safety constraints\n- Primary target files: ${session.allowedFiles.length ? session.allowedFiles.map((file) => `\`${file}\``).join(', ') : 'no source mapping was available; inspect before editing'}\n- Do not edit generated reports, rendered media, lockfiles, secrets, or CI configuration unless the finding directly requires it.\n- Run the project's existing focused checks after editing.\n- Do not render the full video unless the project instructions require it; FrameProof will perform verification separately.\n- Stop and explain instead of guessing when source mapping is insufficient.\n\n## Selected findings\n${packetText}\n\n## Verification context\n- Input: ${report.input}\n- Composition: ${report.context?.compositionId ?? 'unknown'}\n- FPS: ${report.metadata?.fps ?? 'unknown'}\n- Repair preview ranges: ${session.ranges.map((range) => `${range.from}-${range.to}`).join(', ') || 'global'}\n\nAt the end, summarize changed files, the reason for each change, tests run, and any remaining risk.\n`;
};

export const createRepairSession = async (report, {
  reportPath,
  projectRoot = report.manifest?.projectRoot ?? process.cwd(),
  agent = 'codex',
  includeWarnings = false,
  includeUnchanged = false,
  paddingFrames = DEFAULT_PADDING_FRAMES,
  allowedFiles = [],
  renderCommand,
  fullRenderCommand,
  outputVideo,
  maxIterations = 1
} = {}) => {
  const selected = defaultSelectedFindings(report, {includeWarnings, includeUnchanged});
  if (selected.length === 0) throw new Error('No repairable findings were selected');
  const resolvedRoot = path.resolve(projectRoot);
  const durationInFrames = report.manifest?.durationInFrames ?? (report.metadata?.durationSeconds && report.metadata?.fps ? Math.ceil(report.metadata.durationSeconds * report.metadata.fps) : undefined);
  const sourceFiles = selected.flatMap(sourceFilesForFinding);
  const session = {
    schemaVersion: REPAIR_SCHEMA_VERSION,
    toolVersion: VERSION,
    id: sessionId(),
    createdAt: now(),
    updatedAt: now(),
    state: 'planned',
    projectRoot: resolvedRoot,
    reportPath: reportPath ? path.resolve(reportPath) : undefined,
    input: report.input,
    compositionId: report.context?.compositionId,
    fps: report.metadata?.fps,
    agent: {name: agent},
    policy: {
      requireCleanGit: true,
      requireAgentApproval: true,
      requireRenderApproval: true,
      strictAllowedFiles: true,
      allowUnmapped: false,
      maxIterations: Math.max(1, Math.floor(maxIterations))
    },
    allowedFiles: [...new Set([...sourceFiles, ...allowedFiles.map(normalizePath)])].sort(),
    targets: selected.map((finding) => ({
      fingerprint: findingFingerprint(finding, report),
      identity: findingIdentityKey(finding),
      code: finding.code,
      severity: finding.severity,
      revisionStatus: finding.revision?.status,
      fixPacket: fixPacketFor(finding, report)
    })),
    ranges: mergeRepairRanges(selected, {paddingFrames, durationInFrames}),
    commands: {renderPreview: renderCommand, renderFull: fullRenderCommand},
    outputVideo: outputVideo ? path.resolve(resolvedRoot, outputVideo) : undefined,
    attempts: [],
    approvals: [],
    verification: undefined
  };
  session.prompt = buildRepairPrompt(session, report);
  return session;
};

export const validateRepairSession = (session) => {
  if (!session || typeof session !== 'object' || Array.isArray(session)) throw new Error('Repair session must be an object');
  if (session.schemaVersion !== REPAIR_SCHEMA_VERSION) throw new Error(`Unsupported repair session schema: ${session.schemaVersion}`);
  if (!session.id || !session.projectRoot || !Array.isArray(session.targets)) throw new Error('Repair session is missing required fields');
  return session;
};

export const loadRepairSession = async (filePath) => validateRepairSession(JSON.parse(await readFile(filePath, 'utf8')));
export const saveRepairSession = async (filePath, session) => { session.updatedAt = now(); await writeJson(filePath, validateRepairSession(session)); return session; };

const minimalAgentEnvironment = () => {
  const allowed = new Set(['PATH', 'Path', 'HOME', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'SystemRoot', 'WINDIR', 'COMSPEC', 'PATHEXT', 'TEMP', 'TMP', 'TMPDIR', 'LANG', 'LC_ALL', 'LC_CTYPE', 'TERM', 'CI']);
  const env = {FRAMEPROOF_AGENT: '1', NO_COLOR: '1'};
  for (const [key, value] of Object.entries(process.env)) {
    if (allowed.has(key) || key.startsWith('LC_')) env[key] = value;
  }
  return env;
};

const agentInvocation = (session, {agentCommand, agentArgs = [], maxTurns = 8} = {}) => {
  if (agentCommand) return {command: agentCommand, args: agentArgs, input: session.prompt, env: minimalAgentEnvironment()};
  if (session.agent.name === 'claude') return {
    command: 'claude',
    args: [
      '-p', '--output-format', 'json', '--max-turns', String(maxTurns),
      '--allowedTools', 'Read', 'Edit', 'Write', 'Glob', 'Grep',
      '--disallowedTools', 'Bash', 'WebFetch', 'WebSearch', 'Task'
    ],
    input: session.prompt,
    env: minimalAgentEnvironment()
  };
  if (session.agent.name === 'codex') return {
    command: 'codex',
    args: ['exec', '--ephemeral', '--sandbox', 'workspace-write', '--disable', 'plugins'],
    input: session.prompt,
    env: minimalAgentEnvironment()
  };
  throw new Error(`Unsupported agent: ${session.agent.name}. Use codex, claude, or --agent-command.`);
};


const changedSince = (before, after) => {
  const beforeSet = new Set(before.changedFiles ?? []);
  return [...new Set((after.changedFiles ?? []).filter((file) => !beforeSet.has(file)).concat((after.changedFiles ?? []).filter((file) => beforeSet.has(file))))];
};

const pathAllowed = (file, allowedFiles) => {
  const normalized = normalizePath(file);
  return allowedFiles.some((allowed) => normalized === allowed || normalized.startsWith(`${allowed}/`));
};

export const runRepairAgent = async (session, {
  approve = false,
  allowDirty = false,
  strictAllowedFiles = session.policy?.strictAllowedFiles !== false,
  allowUnmapped = session.policy?.allowUnmapped === true,
  agentCommand,
  agentArgs = [],
  maxTurns = 8,
  timeoutMs = DEFAULT_TIMEOUT_MS
} = {}) => {
  validateRepairSession(session);
  if (!approve) throw new Error('Agent execution requires explicit approval (--approve-agent)');
  if (strictAllowedFiles && session.allowedFiles.length === 0 && !allowUnmapped) {
    throw new Error('Repair source is unmapped. Add --allow-file/--allow-directory, or explicitly confirm --allow-unmapped.');
  }
  const before = await getGitSnapshot(session.projectRoot);
  if (!before.isRepository) throw new Error('Repair execution requires a Git repository');
  if (!allowDirty && !before.clean) throw new Error('Git working tree is not clean. Commit/stash changes or use --allow-dirty.');
  const invocation = agentInvocation(session, {agentCommand, agentArgs, maxTurns});
  const startedAt = now();
  const result = await runProcess({...invocation, cwd: session.projectRoot, inheritEnv: false, timeoutMs});
  const after = await getGitSnapshot(session.projectRoot);
  const changedFiles = changedSince(before, after);
  const unexpectedFiles = strictAllowedFiles && !allowUnmapped ? changedFiles.filter((file) => !pathAllowed(file, session.allowedFiles)) : [];
  const attempt = {
    number: session.attempts.length + 1,
    type: 'agent',
    agent: session.agent.name,
    startedAt,
    finishedAt: now(),
    command: [result.command, ...result.args],
    exitCode: result.code,
    timedOut: result.timedOut,
    stdout: truncateLog(result.stdout),
    stderr: truncateLog(result.stderr),
    policy: {strictAllowedFiles, allowUnmapped, allowedFiles: session.allowedFiles},
    git: {before, after, changedFiles, unexpectedFiles}
  };
  session.attempts.push(attempt);
  session.state = result.code !== 0 ? 'agent_failed' : unexpectedFiles.length > 0 ? 'blocked_unexpected_changes' : 'agent_completed';
  session.lastError = result.code !== 0 ? (result.stderr || result.stdout || `Agent exited with ${result.code}`).slice(-4000) : undefined;
  return {session, attempt};
};

export const renderRepairPreviews = async (session, {
  approve = false,
  commandTemplate = session.commands?.renderPreview,
  outputDir,
  timeoutMs = DEFAULT_TIMEOUT_MS
} = {}) => {
  validateRepairSession(session);
  if (!approve) throw new Error('Preview rendering requires explicit approval (--approve-render)');
  if (!commandTemplate) throw new Error('No preview render command is configured');
  const root = path.resolve(session.projectRoot);
  const directory = path.resolve(outputDir ?? path.join(root, '.frameproof', 'repairs', session.id, 'previews'));
  await mkdir(directory, {recursive: true});
  const results = [];
  for (let index = 0; index < session.ranges.length; index += 1) {
    const range = session.ranges[index];
    const output = path.join(directory, `range-${String(index + 1).padStart(3, '0')}-${range.from}-${range.to}.mp4`);
    const values = {
      fromFrame: String(range.from),
      toFrame: String(range.to),
      fromSeconds: session.fps ? String(range.from / session.fps) : '0',
      toSeconds: session.fps ? String(range.to / session.fps) : '0',
      composition: session.compositionId ?? '',
      output,
      projectRoot: root
    };
    const spec = resolveCommandSpec(commandTemplate, values);
    const result = await runProcess({...spec, cwd: root, timeoutMs});
    results.push({...result, commandDisplay: displayCommandSpec(spec), stdout: truncateLog(result.stdout), stderr: truncateLog(result.stderr), output, range});
    if (result.code !== 0) break;
  }
  session.attempts.push({number: session.attempts.length + 1, type: 'preview-render', startedAt: now(), finishedAt: now(), results});
  session.state = results.every((result) => result.code === 0) ? 'preview_ready' : 'render_failed';
  session.previewOutputs = results.filter((result) => result.code === 0).map((result) => result.output);
  return {session, results};
};

export const renderRepairFull = async (session, {
  approve = false,
  commandTemplate = session.commands?.renderFull,
  outputVideo = session.outputVideo,
  timeoutMs = DEFAULT_TIMEOUT_MS
} = {}) => {
  validateRepairSession(session);
  if (!approve) throw new Error('Full rendering requires explicit approval (--approve-render)');
  if (!commandTemplate) throw new Error('No full render command is configured');
  const root = path.resolve(session.projectRoot);
  const output = path.resolve(outputVideo ?? path.join(root, '.frameproof', 'repairs', session.id, 'current.mp4'));
  await ensureParent(output);
  const spec = resolveCommandSpec(commandTemplate, {composition: session.compositionId ?? '', output, projectRoot: root});
  const outputBefore = await snapshotOutput(output);
  const startedAt = now();
  const renderStartedMs = Date.now();
  const result = await runProcess({...spec, cwd: root, timeoutMs});
  const outputAfter = await snapshotOutput(output);
  const freshness = outputAfter.exists ? assessOutputFreshness(outputBefore, outputAfter, renderStartedMs) : {fresh:false, reason:'Expected output was not created'};
  session.attempts.push({number: session.attempts.length + 1, type: 'full-render', startedAt, finishedAt: now(), command:{...spec, display:displayCommandSpec(spec)}, output, outputBefore, outputAfter, freshness, exitCode: result.code, stdout: truncateLog(result.stdout), stderr: truncateLog(result.stderr), timedOut: result.timedOut});
  session.state = result.code === 0 && outputAfter.exists && freshness.fresh ? 'rendered' : 'render_failed';
  session.outputVideo = output;
  return {session, result, output};
};

const targetStatus = (session, revisionItem) => session.targets.find((target) => target.identity === revisionItem.current?.revision?.identity || target.identity === revisionItem.current?.identity || target.identity === revisionItem.change?.identity || target.identity === revisionItem.current && target.fingerprint === revisionItem.fingerprint);

export const verifyRepair = async (session, {
  video = session.outputVideo,
  reportPath = session.reportPath,
  outputDir,
  configPath,
  manifestPath,
  captionsPath,
  acceptances = {schemaVersion: '1.0', acceptances: []}
} = {}) => {
  validateRepairSession(session);
  if (!video) throw new Error('Verification requires a rendered video path');
  if (!reportPath) throw new Error('Verification requires the pre-repair report path');
  const beforeReport = await loadReport(path.resolve(reportPath));
  const config = await loadConfig(configPath, beforeReport.config ?? {});
  const effectiveManifestPath = manifestPath ?? beforeReport.context?.manifestPath;
  const effectiveCaptionsPath = captionsPath ?? beforeReport.context?.captionsPath;
  const currentReport = await scanInput(path.resolve(video), config, {
    manifestPath: effectiveManifestPath ? path.resolve(session.projectRoot, effectiveManifestPath) : undefined,
    captionsPath: effectiveCaptionsPath ? path.resolve(session.projectRoot, effectiveCaptionsPath) : undefined
  });
  const revision = compareReports(currentReport, beforeReport, validateAcceptances(acceptances));
  const targetIdentities = new Set(session.targets.map((target) => target.identity));
  const targetItems = revision.items.filter((item) => item.current && targetIdentities.has(item.current.revision?.identity ?? findingIdentityKey(item.current)) || item.baseline && targetIdentities.has(findingIdentityKey(item.baseline)));
  const unresolvedTargets = targetItems.filter((item) => ['new', 'regressed', 'unchanged'].includes(item.status));
  const newOrRegressedErrors = revision.items.filter((item) => ['new', 'regressed'].includes(item.status) && item.current?.severity === 'error');
  const passed = unresolvedTargets.length === 0 && newOrRegressedErrors.length === 0;
  const directory = path.resolve(outputDir ?? path.join(session.projectRoot, '.frameproof', 'repairs', session.id, 'verification'));
  await mkdir(directory, {recursive: true});
  const currentPath = path.join(directory, 'current-report.json');
  const revisionPath = path.join(directory, 'repair-revision.json');
  await Promise.all([writeJson(currentPath, currentReport), writeJson(revisionPath, revision)]);
  session.verification = {
    verifiedAt: now(),
    video: path.resolve(video),
    passed,
    currentReportPath: currentPath,
    revisionPath,
    summary: revision.summary,
    targetCount: session.targets.length,
    unresolvedTargetCount: unresolvedTargets.length,
    unresolvedTargets: unresolvedTargets.map((item) => ({status: item.status, code: item.current?.code ?? item.baseline?.code, source: item.current?.source ?? item.baseline?.source})),
    newOrRegressedErrorCount: newOrRegressedErrors.length
  };
  session.state = passed ? 'awaiting_human_approval' : 'verification_failed';
  return {session, currentReport, revision};
};

export const approveRepair = async (session, {owner, reason = 'Reviewed and approved'} = {}) => {
  validateRepairSession(session);
  if (!owner) throw new Error('Human approval requires --owner');
  if (!session.verification?.passed) throw new Error('Repair cannot be approved before verification passes');
  const git = await getGitSnapshot(session.projectRoot);
  const receipt = {
    schemaVersion: '1.0',
    repairSessionId: session.id,
    approvedAt: now(),
    owner,
    reason,
    verification: session.verification,
    git: {head: git.head, changedFiles: git.changedFiles, fileHashes: git.fileHashes, diffSha256: git.diffSha256},
    receiptSha256: undefined
  };
  receipt.receiptSha256 = createHash('sha256').update(JSON.stringify(receipt)).digest('hex');
  session.approvals.push(receipt);
  session.state = 'approved';
  return {session, receipt};
};

export const createRepairCommands = (session, sessionPath) => {
  const file = sessionPath ? path.resolve(sessionPath) : `.frameproof/repairs/${session.id}/session.json`;
  return {
    codex: `frameproof repair run ${JSON.stringify(file)} --agent codex --approve-agent`,
    claude: `frameproof repair run ${JSON.stringify(file)} --agent claude --approve-agent`,
    preview: session.commands?.renderPreview ? `frameproof repair preview ${JSON.stringify(file)} --approve-render` : undefined,
    render: session.commands?.renderFull ? `frameproof repair render ${JSON.stringify(file)} --approve-render` : undefined,
    verify: session.outputVideo ? `frameproof repair verify ${JSON.stringify(file)} --video ${JSON.stringify(session.outputVideo)}` : undefined,
    approve: `frameproof repair approve ${JSON.stringify(file)} --owner <name>`
  };
};

const verificationFeedback = (session) => {
  const verification = session.verification;
  if (!verification) return '';
  const unresolved = verification.unresolvedTargets.map((item) => `- ${item.status}: ${item.code}${item.source?.file ? ` (${item.source.file}${item.source.line ? `:${item.source.line}` : ''})` : ''}`).join('\n');
  return `\n\n# Previous repair verification failed\n\nThe previous attempt did not pass FrameProof. Continue from the current working tree and address only the remaining evidence below. Do not revert successful changes.\n\n- Unresolved selected targets: ${verification.unresolvedTargetCount}\n- New or regressed errors: ${verification.newOrRegressedErrorCount}\n${unresolved || '- No mapped target details were available; inspect the verification report.'}\n\nVerification report: ${verification.revisionPath}\n`;
};

export const runRepairLoop = async (session, {
  approveAgent = false,
  approveRender = false,
  allowDirty = false,
  allowUnmapped = false,
  agentCommand,
  agentArgs = [],
  maxTurns = 8,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  previewCommand = session.commands?.renderPreview,
  fullRenderCommand = session.commands?.renderFull,
  outputVideo = session.outputVideo,
  reportPath = session.reportPath,
  configPath,
  manifestPath,
  captionsPath
} = {}) => {
  validateRepairSession(session);
  if (!approveAgent || !approveRender) throw new Error('Repair loop requires --approve-agent and --approve-render');
  if (!fullRenderCommand) throw new Error('Repair loop requires a full render command');
  const maximum = session.policy?.maxIterations ?? 1;
  for (let iteration = session.attempts.filter((attempt) => attempt.type === 'agent').length + 1; iteration <= maximum; iteration += 1) {
    if (iteration > 1) session.prompt += verificationFeedback(session);
    const agentResult = await runRepairAgent(session, {
      approve: true,
      allowDirty: allowDirty || iteration > 1,
      allowUnmapped,
      agentCommand,
      agentArgs,
      maxTurns,
      timeoutMs
    });
    if (agentResult.session.state !== 'agent_completed') return {session, passed: false, stoppedAt: 'agent'};
    if (previewCommand && session.ranges.length > 0) {
      const previewResult = await renderRepairPreviews(session, {approve: true, commandTemplate: previewCommand, timeoutMs});
      if (previewResult.session.state !== 'preview_ready') return {session, passed: false, stoppedAt: 'preview'};
    }
    const renderResult = await renderRepairFull(session, {approve: true, commandTemplate: fullRenderCommand, outputVideo, timeoutMs});
    if (renderResult.session.state !== 'rendered') return {session, passed: false, stoppedAt: 'render'};
    const verifyResult = await verifyRepair(session, {video: renderResult.output, reportPath, configPath, manifestPath, captionsPath});
    session.attempts.push({
      number: session.attempts.length + 1,
      type: 'loop-verification',
      iteration,
      startedAt: verifyResult.session.verification.verifiedAt,
      finishedAt: now(),
      passed: verifyResult.session.verification.passed,
      summary: verifyResult.session.verification.summary
    });
    if (verifyResult.session.verification.passed) return {session, passed: true, stoppedAt: 'human-approval', iteration};
  }
  session.state = 'max_iterations_reached';
  return {session, passed: false, stoppedAt: 'max-iterations'};
};
