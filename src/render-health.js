import {createHash, randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {access, mkdir, readFile, stat, writeFile} from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {probeInput} from './ffmpeg.js';
import {getGitSnapshot} from './repair.js';
import {runPreflight} from './preflight.js';
import {renderRenderReceiptHtml} from './report/render-receipt-html.js';
import {verifyProject} from './workflow.js';
import {displayCommandSpec, resolveCommandSpec} from './command-spec.js';
import {VERSION} from './version.js';

export const RENDER_RECEIPT_SCHEMA_VERSION = '1.0';
const now = () => new Date().toISOString();
const exists = async (filePath) => { try { await access(filePath, constants.F_OK); return true; } catch { return false; } };
const ensureParent = async (filePath) => mkdir(path.dirname(path.resolve(filePath)), {recursive: true});
const sha256File = async (filePath) => createHash('sha256').update(await readFile(filePath)).digest('hex');
const tail = (text, max = 48 * 1024) => text.length <= max ? text : `[truncated ${text.length - max} chars]\n${text.slice(-max)}`;


export const snapshotOutput = async (filePath) => {
  if (!await exists(filePath)) return {exists: false, path: filePath};
  const metadata = await stat(filePath);
  return {exists: true, path: filePath, sizeBytes: metadata.size, mtimeMs: metadata.mtimeMs, ctimeMs: metadata.ctimeMs, sha256: await sha256File(filePath)};
};

export const assessOutputFreshness = (before, after, renderStartedMs) => {
  if (!after) return {fresh: false, reason: 'Expected output was not created'};
  const latestChangeMs = Math.max(after.mtimeMs ?? 0, after.ctimeMs ?? 0);
  if (!before?.exists) {
    return latestChangeMs + 1000 >= renderStartedMs
      ? {fresh: true, reason: 'Output was newly created during this render'}
      : {fresh: true, reason: 'Output was newly created during this render; the renderer preserved its source timestamp'};
  }
  const timestampAdvanced = after.mtimeMs > before.mtimeMs || after.ctimeMs > before.ctimeMs;
  const contentChanged = after.sha256 !== before.sha256 || after.sizeBytes !== before.sizeBytes;
  if (!contentChanged) {
    return {fresh: false, reason: timestampAdvanced
      ? 'Output timestamp changed, but its bytes are identical to the pre-render artifact'
      : 'Output file is unchanged from before the render started'};
  }
  if (latestChangeMs + 1000 < renderStartedMs) return {fresh: false, reason: 'Output content changed, but its timestamp predates this render'};
  return {fresh: true, reason: 'Output content changed during this render'};
};

const signatures = [
  {category:'disk-space', severity:'error', pattern:/(ENOSPC|no space left on device|disk quota exceeded)/i, remediation:'Free disk space, clear render caches, or change the output directory.'},
  {category:'memory', severity:'error', pattern:/(out of memory|heap out of memory|allocation failed|oom-kill|cannot allocate memory)/i, remediation:'Lower concurrency/resolution, increase memory, or split the render.'},
  {category:'file-handles', severity:'error', pattern:/(EMFILE|ENFILE|too many open files)/i, remediation:'Lower render concurrency and raise the process file-handle limit where appropriate.'},
  {category:'font', severity:'error', pattern:/(failed to load font|font.*not found|could not load font|unknown font family)/i, remediation:'Bundle the font locally, wait for it before rendering, and declare it in the FrameProof manifest.'},
  {category:'asset', severity:'error', pattern:/(ENOENT|asset.*not found|404 not found|failed to load resource|could not open input file)/i, remediation:'Fix the asset path, casing, download step, or manifest declaration.'},
  {category:'media-codec', severity:'error', pattern:/(ffmpeg|ffprobe).*(failed|error|not found)|(invalid data found when processing input|decoder.*not found|unsupported codec)/i, remediation:'Verify FFmpeg availability, inspect the source media, and normalize unsupported codecs.'},
  {category:'async-timeout', severity:'error', pattern:/(delayRender.*timed out|timeout waiting for|timed out while rendering|render.*timeout)/i, remediation:'Resolve the pending async task, call continueRender, or increase the timeout only after finding the blocker.'},
  {category:'browser-gpu', severity:'error', pattern:/(browser.*crash|target closed|webgl.*failed|gpu process.*crash|page crashed|chromium.*crash)/i, remediation:'Retry with software rendering or a supported GPU/browser configuration and inspect browser logs.'},
  {category:'permissions', severity:'error', pattern:/(EACCES|EPERM|permission denied|operation not permitted)/i, remediation:'Fix file/directory permissions instead of running the entire workflow with elevated privileges.'},
  {category:'dependency-version', severity:'error', pattern:/(version mismatch|incompatible version|multiple versions of remotion|remotion packages.*same version)/i, remediation:'Align Remotion and related packages to one exact compatible version.'}
];

export const classifyRenderLog = (log) => signatures.filter((item) => item.pattern.test(log)).map(({pattern, ...item}) => {
  const match = log.match(pattern)?.[0];
  return {...item, evidence: match ?? item.category};
});

const runGuardedCommand = ({spec, cwd, timeoutMs, stallMs, onOutput}) => new Promise((resolve, reject) => {
  const startedAt = Date.now();
  let lastOutputAt = startedAt;
  let maxSilenceMs = 0;
  let stallNoted = false;
  let timedOut = false;
  let stdout = '';
  let stderr = '';
  const outputEvents = [];
  const child = spawn(spec.command, spec.args, {cwd, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']});
  const record = (stream, chunk) => {
    const at = Date.now();
    maxSilenceMs = Math.max(maxSilenceMs, at - lastOutputAt);
    lastOutputAt = at;
    const text = chunk.toString();
    if (stream === 'stdout') stdout += text; else stderr += text;
    outputEvents.push({at: new Date(at).toISOString(), stream, text: tail(text, 4096)});
    onOutput?.({stream, text});
  };
  child.stdout.on('data', (chunk) => record('stdout', chunk));
  child.stderr.on('data', (chunk) => record('stderr', chunk));
  child.on('error', (error) => { clearInterval(stallTimer); clearTimeout(timeout); reject(error); });
  const stallTimer = setInterval(() => {
    const silence = Date.now() - lastOutputAt;
    maxSilenceMs = Math.max(maxSilenceMs, silence);
    if (silence >= stallMs) stallNoted = true;
  }, Math.min(1000, Math.max(100, Math.floor(stallMs / 4))));
  stallTimer.unref();
  const timeout = setTimeout(() => {
    timedOut = true;
    child.kill('SIGTERM');
    setTimeout(() => child.kill('SIGKILL'), 3000).unref();
  }, timeoutMs);
  child.on('close', (code, signal) => {
    clearInterval(stallTimer); clearTimeout(timeout);
    maxSilenceMs = Math.max(maxSilenceMs, Date.now() - lastOutputAt);
    resolve({code: code ?? (timedOut ? 124 : 1), signal, stdout, stderr, outputEvents, timedOut, stallNoted, maxSilenceMs, durationMs: Date.now() - startedAt});
  });
});

export const runGuardedRender = async ({
  projectRoot = process.cwd(),
  command,
  approveRender = false,
  outputVideo,
  timeoutMs = 30 * 60 * 1000,
  stallMs = 90 * 1000,
  minimumFreeBytes,
  receiptPath = '.frameproof/artifacts/latest/render-receipt.json',
  receiptHtmlPath,
  verifyAfterRender = false,
  failOnWarning = false
} = {}) => {
  const root = path.resolve(projectRoot);
  if (!approveRender) throw new Error('Render execution requires explicit --approve-render approval');
  const preflight = await runPreflight({projectRoot: root, minimumFreeBytes, renderCommand: command, outputVideo});
  if (!preflight.ready) {
    const receipt = {
      schemaVersion: RENDER_RECEIPT_SCHEMA_VERSION, frameproofVersion: VERSION, id: `render-${randomUUID()}`, generatedAt: now(), projectRoot: root,
      command: command ?? preflight.renderCommand, preflight, result: {passed:false, blocked:true, reason:'preflight-errors'}
    };
    const target = path.resolve(root, receiptPath);
    await ensureParent(target); await writeFile(target, `${JSON.stringify(receipt, null, 2)}\n`);
    if (receiptHtmlPath) { const html = path.resolve(root, receiptHtmlPath); await ensureParent(html); await writeFile(html, renderRenderReceiptHtml(receipt)); }
    return {receipt, receiptPath: target};
  }
  const selectedCommand = command ?? preflight.renderCommand;
  if (!selectedCommand) throw new Error('No render command is configured; pass --command or configure project.renderCommand/scripts.render');
  const resolvedOutput = path.resolve(root, outputVideo ?? preflight.outputVideo ?? 'out/video.mp4');
  const outputBefore = await snapshotOutput(resolvedOutput);
  const commandSpec = resolveCommandSpec(selectedCommand, {output: resolvedOutput, projectRoot: root});
  const gitBefore = await getGitSnapshot(root);
  const startedAt = now();
  const renderStartedMs = Date.now();
  const processResult = await runGuardedCommand({spec: commandSpec, cwd: root, timeoutMs, stallMs});
  const endedAt = now();
  const combinedLog = `${processResult.stdout}\n${processResult.stderr}`;
  const advisorFindings = classifyRenderLog(combinedLog);
  if (processResult.stallNoted) advisorFindings.unshift({category:'stall', severity:'warning', evidence:`No output for up to ${processResult.maxSilenceMs} ms`, remediation:'Inspect CPU/GPU/disk activity and the last render log line; reduce concurrency or add progress output.'});
  if (processResult.timedOut) advisorFindings.unshift({category:'timeout', severity:'error', evidence:`Render exceeded ${timeoutMs} ms`, remediation:'Identify the stalled frame/async task before increasing the timeout.'});

  let output;
  if (await exists(resolvedOutput)) {
    const metadata = await stat(resolvedOutput);
    let probe;
    try { probe = await probeInput(resolvedOutput, 30); } catch (error) { advisorFindings.push({category:'output-probe', severity:'error', evidence:error.message, remediation:'The output exists but cannot be decoded; inspect FFmpeg logs and codec settings.'}); }
    const sha256 = await sha256File(resolvedOutput);
    const freshness = assessOutputFreshness(outputBefore, {sizeBytes: metadata.size, sha256, mtimeMs: metadata.mtimeMs, ctimeMs: metadata.ctimeMs}, renderStartedMs);
    if (!freshness.fresh) advisorFindings.push({category:'stale-output', severity:'error', evidence:freshness.reason, remediation:'Ensure the render command writes the configured output during this run. Use an {output} token or remove stale artifacts before rendering.'});
    output = {path: resolvedOutput, sizeBytes: metadata.size, sha256, metadata: probe, before: outputBefore, freshness};
  } else {
    output = {path: resolvedOutput, missing: true};
    advisorFindings.push({category:'missing-output', severity:'error', evidence:`Expected output was not created: ${resolvedOutput}`, remediation:'Correct --output-video/project.input or fix the render command.'});
  }

  let verification;
  if (verifyAfterRender && !output.missing) {
    try {
      const verified = await verifyProject({projectRoot: root, input: resolvedOutput, failOnWarning});
      verification = {performed:true, passed:verified.passed, outputRoot:verified.outputRoot, summary:verified.summary, paths:verified.paths};
    } catch (error) { verification = {performed:true, passed:false, error:error.message}; advisorFindings.push({category:'verification', severity:'error', evidence:error.message, remediation:'Repair the FrameProof project settings or inspect the rendered output.'}); }
  } else verification = {performed:false};

  const gitAfter = await getGitSnapshot(root);
  const passed = processResult.code === 0 && !processResult.timedOut && !output.missing && !advisorFindings.some((item) => item.severity === 'error') && (!verification.performed || verification.passed);
  const receipt = {
    schemaVersion: RENDER_RECEIPT_SCHEMA_VERSION,
    frameproofVersion: VERSION,
    id: `render-${randomUUID()}`,
    generatedAt: now(), projectRoot: root, command: { ...commandSpec, display: displayCommandSpec(commandSpec) },
    startedAt, endedAt,
    preflight,
    process: {...processResult, stdout: undefined, stderr: undefined, logTail: tail(combinedLog), outputEvents: processResult.outputEvents.slice(-100)},
    advisor: {findings: advisorFindings},
    output,
    verification,
    git: {before:gitBefore, after:gitAfter},
    result: {passed, blocked:false, exitCode:processResult.code}
  };
  const target = path.resolve(root, receiptPath);
  await ensureParent(target); await writeFile(target, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  const htmlTarget = receiptHtmlPath ? path.resolve(root, receiptHtmlPath) : undefined;
  if (htmlTarget) { await ensureParent(htmlTarget); await writeFile(htmlTarget, renderRenderReceiptHtml(receipt), 'utf8'); }
  return {receipt, receiptPath: target, receiptHtmlPath: htmlTarget};
};
