import test from 'node:test';
import assert from 'node:assert/strict';
import {copyFile, mkdtemp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {diagnoseEnvironment} from '../src/doctor.js';
import {baselineStatus, initializeProject, setBaseline} from '../src/onboarding.js';
import {verifyProject} from '../src/workflow.js';

const makeProject = async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'frameproof-onboarding-'));
  await writeFile(path.join(root, 'package.json'), JSON.stringify({name: 'fixture', version: '1.0.0', scripts: {}, devDependencies: {remotion: '^4.0.0'}}, null, 2));
  await mkdir(path.join(root, 'out'), {recursive: true});
  await copyFile(path.resolve('examples/demo/passing.mp4'), path.join(root, 'out', 'video.mp4'));
  return root;
};

test('init detects Remotion and creates a non-destructive project profile', async () => {
  const root = await makeProject();
  try {
    const result = await initializeProject({projectRoot: root, preset: 'x-video', github: true});
    assert.equal(result.projectType, 'remotion');
    assert.ok(result.created.includes('.frameproof/project.json'));
    assert.ok(result.created.includes('.github/workflows/frameproof.yml'));
    const project = JSON.parse(await readFile(path.join(root, '.frameproof/project.json'), 'utf8'));
    assert.equal(project.input, 'out/video.mp4');
    assert.equal(project.manifest, null);
    assert.equal(project.preset, 'x-video');
    assert.ok(await readFile(path.join(root, '.frameproof/manifest.example.json'), 'utf8'));
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('init dry-run lists files without writing them', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'frameproof-init-dry-'));
  try {
    const result = await initializeProject({projectRoot: root, dryRun: true});
    assert.ok(result.created.includes('.frameproof/project.json'));
    await assert.rejects(readFile(path.join(root, '.frameproof/project.json'), 'utf8'));
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('verify writes a stable artifact bundle and baseline can be promoted', async () => {
  const root = await makeProject();
  try {
    await initializeProject({projectRoot: root});
    const first = await verifyProject({projectRoot: root, useBaseline: false});
    assert.equal(typeof first.passed, 'boolean');
    assert.ok(first.paths.json.endsWith('report.json'));
    const verification = JSON.parse(await readFile(path.join(first.outputRoot, 'verification.json'), 'utf8'));
    assert.equal(verification.video, path.join(root, 'out', 'video.mp4'));

    const baseline = await setBaseline(first.paths.json, {projectRoot: root});
    assert.ok(baseline.receipt.sha256.length === 64);
    const status = await baselineStatus({projectRoot: root});
    assert.equal(status.exists, true);
    assert.equal(status.sha256, baseline.receipt.sha256);

    const second = await verifyProject({projectRoot: root});
    assert.ok(second.revision);
    assert.equal(second.revision.summary.new, 0);
    assert.equal(second.revision.summary.regressed, 0);
    assert.equal(second.passed, true);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('doctor reports required tools and optional agent availability', async () => {
  const root = await makeProject();
  try {
    const diagnosis = await diagnoseEnvironment({projectRoot: root});
    assert.equal(diagnosis.ready, true);
    assert.equal(diagnosis.project.type, 'remotion');
    assert.equal(typeof diagnosis.agents.codex, 'boolean');
    assert.equal(typeof diagnosis.agents.claude, 'boolean');
    assert.ok(diagnosis.checks.some((check) => check.id === 'ffmpeg' && check.status === 'pass'));
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});
