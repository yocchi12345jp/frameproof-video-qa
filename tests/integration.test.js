import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';

const run = (command, args, cwd) => new Promise((resolve, reject) => {
  const child = spawn(command, args, {cwd, stdio: ['ignore', 'pipe', 'pipe']});
  const stdout = [];
  const stderr = [];
  child.stdout.on('data', (chunk) => stdout.push(chunk));
  child.stderr.on('data', (chunk) => stderr.push(chunk));
  child.on('error', reject);
  child.on('close', (code) => resolve({code, stdout: Buffer.concat(stdout).toString('utf8'), stderr: Buffer.concat(stderr).toString('utf8')}));
});

test('CLI lists platform presets', async () => {
  const result = await run(process.execPath, [path.resolve('src/cli.js'), 'presets'], path.resolve('.'));
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /x-video/);
  assert.match(result.stdout, /x-ad/);
});

test('CLI scans a synthetic video and writes JSON/HTML reports', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'frameproof-'));
  try {
    const video = path.join(directory, 'sample.mp4');
    const json = path.join(directory, 'report.json');
    const html = path.join(directory, 'report.html');
    const create = await run('ffmpeg', [
      '-v', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=320x180:d=1:r=10',
      '-f', 'lavfi', '-i', 'testsrc2=s=320x180:d=1:r=10',
      '-filter_complex', '[0:v][1:v]concat=n=2:v=1:a=0[out]',
      '-map', '[out]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-y', video
    ]);
    assert.equal(create.code, 0, create.stderr);

    const scan = await run(process.execPath, [
      path.resolve('src/cli.js'), 'scan', video, '--preset', 'x-ad', '--aspect', '16:9',
      '--max-frozen-seconds', '0.5', '--json', json, '--html', html
    ], path.resolve('.'));
    assert.equal(scan.code, 1, scan.stderr);
    const report = JSON.parse(await readFile(json, 'utf8'));
    assert.equal(report.summary.frameCount, 20);
    assert.equal(report.config.preset, 'x-ad');
    assert.equal(report.metadata.codec, 'h264');
    assert.equal(report.metadata.pixelFormat, 'yuv420p');
    assert.match(report.metadata.container, /mp4/);
    assert.ok(report.findings.some((finding) => finding.code === 'BLANK_FRAME'));
    assert.ok((await readFile(html, 'utf8')).includes('FrameProof Video QA'));
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});

test('CLI fails safely when analysis exceeds the configured frame budget', async () => {
  const video = path.resolve('examples/demo/failing.mp4');
  const result = await run(process.execPath, [
    path.resolve('src/cli.js'), 'scan', video,
    '--maximum-analysis-frames', '1',
    '--analysis-timeout-seconds', '30'
  ], path.resolve('.'));
  assert.equal(result.code, 2);
  assert.match(result.stderr, /exceeding maximumAnalysisFrames=1/);
});
