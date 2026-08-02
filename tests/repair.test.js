import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {loadConfig} from '../src/config.js';
import {scanInput} from '../src/scan.js';
import {
  approveRepair,
  createRepairSession,
  createRepairCommands,
  mergeRepairRanges,
  renderRepairFull,
  renderRepairPreviews,
  runRepairAgent,
  runRepairLoop,
  saveRepairSession,
  verifyRepair
} from '../src/repair.js';

const run = (command, args, cwd) => new Promise((resolve, reject) => {
  const child = spawn(command, args, {cwd, stdio: ['ignore', 'pipe', 'pipe']});
  let stdout = ''; let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.on('error', reject);
  child.on('close', (code) => code === 0 ? resolve(stdout) : reject(new Error(`${command} failed: ${stderr}`)));
});

const initProject = async () => {
  const project = await mkdtemp(path.join(tmpdir(), 'frameproof-repair-project-'));
  await mkdir(path.join(project, 'src/scenes'), {recursive: true});
  await writeFile(path.join(project, 'src/scenes/CtaScene.tsx'), 'export const size = 22;\n');
  await writeFile(path.join(project, 'fake-agent.mjs'), `import {readFile, writeFile} from 'node:fs/promises';\nlet prompt=''; for await (const c of process.stdin) prompt += c;\nconst file='src/scenes/CtaScene.tsx'; const text=await readFile(file,'utf8'); await writeFile(file,text.replace('22','44')); console.log(JSON.stringify({ok:true,promptLength:prompt.length}));\n`);
  await writeFile(path.join(project, 'render.mjs'), `import {mkdir, writeFile} from 'node:fs/promises'; import path from 'node:path'; const out=process.argv[2]; await mkdir(path.dirname(out),{recursive:true}); await writeFile(out,'preview');\n`);
  await run('git', ['init'], project);
  await run('git', ['config', 'user.email', 'frameproof@example.test'], project);
  await run('git', ['config', 'user.name', 'FrameProof Test'], project);
  await run('git', ['add', '.'], project);
  await run('git', ['commit', '-m', 'fixture'], project);
  return project;
};

const mappedReport = (project) => ({
  schemaVersion: '2.1', toolVersion: '0.6.0', generatedAt: new Date().toISOString(), input: 'out/video.mp4',
  metadata: {fps: 30, durationSeconds: 10, width: 1920, height: 1080},
  context: {mode: 'source-aware', compositionId: 'ProductLaunch'},
  manifest: {projectRoot: project, durationInFrames: 300},
  summary: {errors: 1, warnings: 0, frameCount: 300, passed: false},
  findings: [{code: 'TEXT_TOO_SMALL', severity: 'error', message: 'Text is too small', frames: [120, 121], source: {file: 'src/scenes/CtaScene.tsx', line: 1}, details: {expected: {minimumPx: 32}, actual: {fontSizePx: 22}}, fixPacketId: 'TEXT_TOO_SMALL:120:121'}],
  fixPackets: [{id: 'TEXT_TOO_SMALL:120:121', ruleId: 'TEXT_TOO_SMALL', severity: 'error', message: 'Text is too small', frames: {from: 120, to: 121}, source: {file: 'src/scenes/CtaScene.tsx', line: 1}, expected: {minimumPx: 32}, actual: {fontSizePx: 22}, suggestedActions: ['Increase font size']}]
});

test('repair ranges merge nearby findings with padding', () => {
  const findings = [
    {code: 'A', frames: [10, 11], source: {file: 'a.js'}},
    {code: 'B', frames: [20], source: {file: 'b.js'}},
    {code: 'C', frames: [100], source: {file: 'c.js'}}
  ];
  const ranges = mergeRepairRanges(findings, {paddingFrames: 5, durationInFrames: 120});
  assert.deepEqual(ranges.map(({from, to}) => [from, to]), [[5, 25], [95, 105]]);
});

test('repair session maps targets, prompt, ranges, and commands', async () => {
  const project = await initProject();
  const session = await createRepairSession(mappedReport(project), {projectRoot: project, reportPath: 'report.json', agent: 'codex'});
  assert.equal(session.state, 'planned');
  assert.deepEqual(session.allowedFiles, ['src/scenes/CtaScene.tsx']);
  assert.equal(session.targets.length, 1);
  assert.match(session.prompt, /FrameProof repair task/);
  assert.match(session.prompt, /src\/scenes\/CtaScene.tsx/);
  assert.match(createRepairCommands(session, 'session.json').codex, /--approve-agent/);
});

test('repair agent requires approval and records Git changes', async () => {
  const project = await initProject();
  const session = await createRepairSession(mappedReport(project), {projectRoot: project, reportPath: 'report.json', agent: 'custom'});
  await assert.rejects(() => runRepairAgent(session, {agentCommand: process.execPath, agentArgs: ['fake-agent.mjs']}), /explicit approval/);
  const result = await runRepairAgent(session, {approve: true, agentCommand: process.execPath, agentArgs: ['fake-agent.mjs']});
  assert.equal(result.session.state, 'agent_completed');
  assert.deepEqual(result.attempt.git.changedFiles, ['src/scenes/CtaScene.tsx']);
  assert.deepEqual(result.attempt.git.unexpectedFiles, []);
  assert.equal(result.attempt.git.after.fileHashes['src/scenes/CtaScene.tsx'].length, 64);
  assert.equal(result.attempt.git.after.diffSha256.length, 64);
  assert.match(await readFile(path.join(project, 'src/scenes/CtaScene.tsx'), 'utf8'), /44/);
});

test('repair preview and full render commands require approval', async () => {
  const project = await initProject();
  const session = await createRepairSession(mappedReport(project), {
    projectRoot: project,
    reportPath: 'report.json',
    renderCommand: `node render.mjs "{output}"`,
    fullRenderCommand: `node render.mjs "{output}"`
  });
  await assert.rejects(() => renderRepairPreviews(session), /explicit approval/);
  const previews = await renderRepairPreviews(session, {approve: true});
  assert.equal(previews.session.state, 'preview_ready');
  assert.equal(previews.session.previewOutputs.length, 1);
  const full = await renderRepairFull(session, {approve: true});
  assert.equal(full.session.state, 'rendered');
  assert.ok(await readFile(full.output, 'utf8'));
});

test('repair verification resolves targeted errors and enables human approval', async () => {
  const project = await initProject();
  const config = await loadConfig(undefined, {expectedAspect: '16:9', maxFrozenSeconds: 0.5, checkEdgeActivity: false, checkPlatformMetadata: false});
  const before = await scanInput(path.resolve('examples/demo/failing.mp4'), config);
  const reportDir = await mkdtemp(path.join(tmpdir(), 'frameproof-repair-report-'));
  const reportPath = path.join(reportDir, 'before.json');
  await writeFile(reportPath, `${JSON.stringify(before, null, 2)}\n`);
  const sessionPath = path.join(project, '.frameproof/repairs/session.json');
  const session = await createRepairSession(before, {projectRoot: project, reportPath, agent: 'codex'});
  await saveRepairSession(sessionPath, session);
  const verified = await verifyRepair(session, {video: path.resolve('examples/demo/passing.mp4')});
  assert.equal(verified.session.state, 'awaiting_human_approval');
  assert.equal(verified.session.verification.passed, true);
  await assert.rejects(() => approveRepair(verified.session, {}), /requires --owner/);
  const approved = await approveRepair(verified.session, {owner: 'reviewer'});
  assert.equal(approved.session.state, 'approved');
  assert.equal(approved.receipt.owner, 'reviewer');
  assert.equal(approved.receipt.receiptSha256.length, 64);
  assert.deepEqual(approved.receipt.git.fileHashes, {});
});


test('repair loop stops at human approval after agent, render, and verification pass', async () => {
  const project = await initProject();
  const config = await loadConfig(undefined, {expectedAspect: '16:9', maxFrozenSeconds: 0.5, checkEdgeActivity: false, checkPlatformMetadata: false});
  const before = await scanInput(path.resolve('examples/demo/failing.mp4'), config);
  const reportDir = await mkdtemp(path.join(tmpdir(), 'frameproof-repair-report-'));
  const reportPath = path.join(reportDir, 'before.json');
  await writeFile(reportPath, `${JSON.stringify(before, null, 2)}\n`);
  const passing = path.resolve('examples/demo/passing.mp4');
  await writeFile(path.join(project, 'copy-render.mjs'), `import {copyFile, mkdir} from 'node:fs/promises'; import path from 'node:path'; const out=process.argv[2]; await mkdir(path.dirname(out),{recursive:true}); await copyFile(${JSON.stringify(passing)},out);\n`);
  await run('git', ['add', 'copy-render.mjs'], project);
  await run('git', ['commit', '-m', 'render fixture'], project);
  const outputVideo = path.join(project, '.frameproof/repairs/current.mp4');
  const session = await createRepairSession(before, {
    projectRoot: project,
    reportPath,
    agent: 'custom',
    fullRenderCommand: `node copy-render.mjs "{output}"`,
    outputVideo,
    allowedFiles: ['src/scenes/CtaScene.tsx'],
    maxIterations: 1
  });
  // The generic file-only report has no source mapping; keep the test agent edit inside an explicit allowlist.
  session.allowedFiles = ['src/scenes/CtaScene.tsx'];
  const result = await runRepairLoop(session, {
    approveAgent: true,
    approveRender: true,
    agentCommand: process.execPath,
    agentArgs: ['fake-agent.mjs'],
    fullRenderCommand: `node copy-render.mjs "{output}"`,
    outputVideo
  });
  assert.equal(result.passed, true);
  assert.equal(result.stoppedAt, 'human-approval');
  assert.equal(result.session.state, 'awaiting_human_approval');
  assert.ok(result.session.attempts.some((attempt) => attempt.type === 'loop-verification' && attempt.passed));
});

test('unmapped repair fails closed unless an explicit scope override is supplied', async () => {
  const project = await initProject();
  const report = mappedReport(project);
  report.context.mode = 'file-only';
  report.findings[0].source = undefined;
  report.fixPackets[0].source = undefined;
  const session = await createRepairSession(report, {projectRoot: project, reportPath: 'report.json', agent: 'custom'});
  assert.deepEqual(session.allowedFiles, []);
  await assert.rejects(() => runRepairAgent(session, {approve:true, agentCommand:process.execPath, agentArgs:['fake-agent.mjs']}), /source is unmapped/);
  const allowed = await runRepairAgent(session, {approve:true, allowUnmapped:true, agentCommand:process.execPath, agentArgs:['fake-agent.mjs']});
  assert.equal(allowed.session.state, 'agent_completed');
  assert.equal(allowed.attempt.policy.allowUnmapped, true);
});

test('full repair render rejects a stale pre-existing output', async () => {
  const project = await initProject();
  const session = await createRepairSession(mappedReport(project), {
    projectRoot: project,
    reportPath: 'report.json',
    fullRenderCommand: ['node','-e',''],
    outputVideo: 'out/stale.mp4'
  });
  await mkdir(path.join(project, 'out'), {recursive:true});
  await writeFile(path.join(project, 'out/stale.mp4'), 'old');
  const result = await renderRepairFull(session, {approve:true});
  assert.equal(result.session.state, 'render_failed');
  assert.equal(result.session.attempts.at(-1).freshness.fresh, false);
});

test('custom Agent receives only the minimal environment allowlist', async () => {
  const project = await initProject();
  await writeFile(path.join(project, 'env-agent.mjs'), `import {writeFile} from 'node:fs/promises';\nlet prompt=''; for await (const c of process.stdin) prompt += c;\nawait writeFile('src/scenes/CtaScene.tsx', process.env.FRAMEPROOF_TEST_SECRET || 'secret-not-forwarded');\n`);
  await run('git', ['add', 'env-agent.mjs'], project);
  await run('git', ['commit', '-m', 'env agent'], project);
  const session = await createRepairSession(mappedReport(project), {projectRoot: project, reportPath: 'report.json', agent: 'custom'});
  const previous = process.env.FRAMEPROOF_TEST_SECRET;
  process.env.FRAMEPROOF_TEST_SECRET = 'must-not-leak';
  try {
    const result = await runRepairAgent(session, {approve:true, agentCommand:process.execPath, agentArgs:['env-agent.mjs']});
    assert.equal(result.session.state, 'agent_completed');
    assert.equal(await readFile(path.join(project, 'src/scenes/CtaScene.tsx'), 'utf8'), 'secret-not-forwarded');
  } finally {
    if (previous === undefined) delete process.env.FRAMEPROOF_TEST_SECRET;
    else process.env.FRAMEPROOF_TEST_SECRET = previous;
  }
});
