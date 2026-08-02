import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {classifyRenderLog, runGuardedRender} from '../src/render-health.js';
import {runPreflight} from '../src/preflight.js';

const project = async ({remotionMismatch = false, missingFiles = false} = {}) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'frameproof-preflight-'));
  await mkdir(path.join(root, '.frameproof'), {recursive: true});
  await mkdir(path.join(root, 'out'), {recursive: true});
  await writeFile(path.join(root, 'package.json'), JSON.stringify({
    name:'fixture', version:'1.0.0', scripts:{render:'node render.mjs'},
    devDependencies: remotionMismatch ? {remotion:'4.0.1','@remotion/renderer':'5.0.0'} : {remotion:'4.0.1','@remotion/renderer':'4.0.1'}
  }, null, 2));
  await writeFile(path.join(root, 'package-lock.json'), '{}');
  await writeFile(path.join(root, 'frameproof.config.json'), JSON.stringify({checkBlankFrames:true}));
  await writeFile(path.join(root, '.frameproof', 'project.json'), JSON.stringify({schemaVersion:'1.0',projectType:'remotion',input:'out/video.mp4',config:'frameproof.config.json',manifest:'.frameproof/manifest.json',baseline:'.frameproof/baseline.json',acceptances:'.frameproof/acceptances.json',artifactsDir:'.frameproof/artifacts'}));
  await writeFile(path.join(root, '.frameproof', 'manifest.json'), JSON.stringify({schemaVersion:'1.0',compositionId:'Fixture',fps:30,durationInFrames:30,regions:[],assertions:[],metadata:{assets:[missingFiles ? 'assets/missing.png' : {path:'assets/optional.png',optional:true}],fonts:[missingFiles ? 'fonts/missing.woff2' : {path:'fonts/optional.woff2',optional:true}]}}));
  await writeFile(path.join(root, 'render.mjs'), `import {execFileSync} from 'node:child_process'; execFileSync('ffmpeg',['-y','-f','lavfi','-i','color=c=blue:s=320x180:d=0.5','-c:v','libx264','-pix_fmt','yuv420p','out/video.mp4'],{stdio:'inherit'}); console.log('render complete');`);
  return root;
};

test('preflight validates dependencies and declared inputs', async () => {
  const root = await project();
  try {
    const result = await runPreflight({projectRoot:root, minimumFreeBytes:1});
    assert.equal(result.ready, true);
    assert.ok(result.checks.some((item) => item.id === 'dependencies.remotion' && item.status === 'pass'));
    assert.ok(result.checks.some((item) => item.id === 'asset.0' && item.status === 'warning'));
  } finally { await rm(root, {recursive:true, force:true}); }
});

test('preflight blocks major Remotion mismatch and required missing inputs', async () => {
  const root = await project({remotionMismatch:true, missingFiles:true});
  try {
    const result = await runPreflight({projectRoot:root, minimumFreeBytes:1});
    assert.equal(result.ready, false);
    assert.ok(result.checks.some((item) => item.id === 'dependencies.remotion' && item.status === 'error'));
    assert.ok(result.checks.some((item) => item.id === 'asset.0' && item.status === 'error'));
    assert.ok(result.checks.some((item) => item.id === 'font.0' && item.status === 'error'));
  } finally { await rm(root, {recursive:true, force:true}); }
});

test('render log advisor classifies common production failures', () => {
  const findings = classifyRenderLog('ENOSPC: no space left on device\nError: delayRender timed out\nEMFILE too many open files');
  assert.deepEqual(new Set(findings.map((item) => item.category)), new Set(['disk-space','file-handles','async-timeout']));
});

test('guarded render requires explicit approval', async () => {
  const root = await project();
  try {
    await assert.rejects(runGuardedRender({projectRoot:root, command:'node render.mjs'}), /approve-render/);
  } finally { await rm(root, {recursive:true, force:true}); }
});

test('guarded render creates output hash, probe metadata, and receipt', async () => {
  const root = await project();
  try {
    const result = await runGuardedRender({projectRoot:root, command:'node render.mjs', approveRender:true, outputVideo:'out/video.mp4', minimumFreeBytes:1, stallMs:30_000, timeoutMs:60_000, receiptPath:'.frameproof/render-receipt.json', receiptHtmlPath:'.frameproof/render-receipt.html'});
    assert.equal(result.receipt.result.passed, true);
    assert.equal(result.receipt.output.sha256.length, 64);
    assert.equal(result.receipt.output.metadata.width, 320);
    assert.ok(await readFile(result.receiptPath, 'utf8'));
    assert.match(await readFile(result.receiptHtmlPath, 'utf8'), /FrameProof render receipt/);
  } finally { await rm(root, {recursive:true, force:true}); }
});

test('guarded render records stalls without falsely passing a missing output', async () => {
  const root = await project();
  try {
    const command = `node -e "setTimeout(()=>console.log('done'),250)"`;
    const result = await runGuardedRender({projectRoot:root, command, approveRender:true, outputVideo:'out/missing.mp4', minimumFreeBytes:1, stallMs:50, timeoutMs:2_000, receiptPath:'.frameproof/stall.json'});
    assert.equal(result.receipt.result.passed, false);
    assert.ok(result.receipt.advisor.findings.some((item) => item.category === 'stall'));
    assert.ok(result.receipt.advisor.findings.some((item) => item.category === 'missing-output'));
  } finally { await rm(root, {recursive:true, force:true}); }
});

test('guarded render rejects a stale pre-existing output', async () => {
  const root = await project();
  try {
    await runGuardedRender({projectRoot:root, command:'node render.mjs', approveRender:true, outputVideo:'out/video.mp4', minimumFreeBytes:1, timeoutMs:60_000, receiptPath:'.frameproof/initial.json'});
    const stale = await runGuardedRender({projectRoot:root, command:['node','-e',''], approveRender:true, outputVideo:'out/video.mp4', minimumFreeBytes:1, timeoutMs:10_000, receiptPath:'.frameproof/stale.json'});
    assert.equal(stale.receipt.result.passed, false);
    assert.equal(stale.receipt.output.freshness.fresh, false);
    assert.ok(stale.receipt.advisor.findings.some((item) => item.category === 'stale-output'));
  } finally { await rm(root, {recursive:true, force:true}); }
});

test('guarded render rejects shell operators instead of interpreting them', async () => {
  const root = await project();
  try {
    await assert.rejects(() => runGuardedRender({projectRoot:root, command:'node render.mjs && echo unsafe', approveRender:true, outputVideo:'out/video.mp4', minimumFreeBytes:1}), /Shell operators/);
  } finally { await rm(root, {recursive:true, force:true}); }
});

test('guarded render rejects timestamp-only rewrites of an old artifact', async () => {
  const root = await project();
  try {
    await runGuardedRender({projectRoot:root, command:'node render.mjs', approveRender:true, outputVideo:'out/video.mp4', minimumFreeBytes:1, timeoutMs:60_000, receiptPath:'.frameproof/initial-touch.json'});
    const touchScript = `import {utimes} from 'node:fs/promises'; const now=new Date(); await utimes('out/video.mp4',now,now);`;
    await writeFile(path.join(root, 'touch.mjs'), touchScript);
    const stale = await runGuardedRender({projectRoot:root, command:['node','touch.mjs'], approveRender:true, outputVideo:'out/video.mp4', minimumFreeBytes:1, timeoutMs:10_000, receiptPath:'.frameproof/touched.json'});
    assert.equal(stale.receipt.result.passed, false);
    assert.match(stale.receipt.output.freshness.reason, /bytes are identical/);
  } finally { await rm(root, {recursive:true, force:true}); }
});
