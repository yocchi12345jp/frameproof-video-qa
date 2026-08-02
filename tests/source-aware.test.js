import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {createManifest, validateManifest} from '../src/manifest.js';
import {beginManifestCollection, endManifestCollection, FrameProof, createManifestBuilder} from '../src/assertions.js';
import {parseSrt, parseVtt, parseCaptionJson, auditCaptions} from '../src/captions.js';
import {getPlatformOverlay} from '../src/platform-overlays.js';
import {scanInput} from '../src/scan.js';
import {loadConfig} from '../src/config.js';

const run = (command, args, cwd = process.cwd()) => new Promise((resolve, reject) => {
  const child = spawn(command, args, {cwd, stdio: ['ignore', 'pipe', 'pipe']});
  const stdout = [];
  const stderr = [];
  child.stdout.on('data', (chunk) => stdout.push(chunk));
  child.stderr.on('data', (chunk) => stderr.push(chunk));
  child.on('error', reject);
  child.on('close', (code) => resolve({code, stdout: Buffer.concat(stdout).toString('utf8'), stderr: Buffer.concat(stderr).toString('utf8')}));
});

const manifestCandidate = {
  compositionId: 'Demo', fps: 10, durationInFrames: 20, width: 320, height: 180,
  regions: [{id: 'cta', from: 10, to: 19, role: 'cta', source: 'src/Cta.tsx:42', box: {x: .1, y: .82, width: .8, height: .15}, style: {fontSizePx: 20, lineCount: 3}}],
  assertions: [
    {id: 'cta-motion', kind: 'motion', from: 10, to: 19, regionId: 'cta', expected: {minimumChange: .02}},
    {id: 'cta-copy', kind: 'text', from: 10, to: 19, regionId: 'cta', expected: {minimumPx: 32, maximumLines: 2}},
    {id: 'cta-safe', kind: 'safe-area', from: 10, to: 19, regionId: 'cta', expected: {platform: 'x-video', marginRatio: .05}}
  ]
};

test('manifest validates source regions and assertions', () => {
  const manifest = createManifest(manifestCandidate);
  assert.equal(manifest.schemaVersion, '1.0');
  assert.equal(manifest.regions[0].source.file, 'src/Cta.tsx');
  assert.equal(manifest.regions[0].source.line, 42);
  assert.throws(() => validateManifest({...manifestCandidate, assertions: [{id: 'missing', kind: 'text', from: 0, to: 2, regionId: 'nope'}]}), /missing region/);
});

test('assertion SDK supports builder and no-op component collection', () => {
  const built = createManifestBuilder({compositionId: 'Built', fps: 30, durationInFrames: 60})
    .region({id: 'title', from: 0, to: 29, source: 'src/Title.tsx:5'})
    .expectVisible({id: 'title-visible', from: 0, to: 29, regionId: 'title'})
    .build();
  assert.equal(built.assertions[0].kind, 'visible');

  beginManifestCollection({compositionId: 'Collected', fps: 30, durationInFrames: 60});
  FrameProof.Region({id: 'cta', from: 30, to: 59, source: 'src/Cta.tsx:8'});
  FrameProof.ExpectMotion({id: 'cta-motion', from: 30, to: 45, regionId: 'cta', expected: {minimumChange: .1}});
  assert.equal(FrameProof.ExpectMotion({id: 'cta-motion', from: 30, to: 45, regionId: 'cta', expected: {minimumChange: .1}}), null);
  const collected = endManifestCollection();
  assert.equal(collected.regions.length, 1);
  assert.equal(collected.assertions.length, 1);
});

test('caption adapters parse SRT, VTT, and JSON', () => {
  assert.equal(parseSrt('1\n00:00:00,000 --> 00:00:01,000\nHello')[0].endMs, 1000);
  assert.equal(parseVtt('WEBVTT\n\n00:00.000 --> 00:01.000\nHello')[0].text, 'Hello');
  assert.equal(parseCaptionJson(JSON.stringify([{startMs: 0, endMs: 500, text: 'Hi'}]))[0].id, '1');
});

test('caption audit catches reading and collision defects', () => {
  const manifest = createManifest(manifestCandidate);
  const captions = parseSrt('1\n00:00:00,000 --> 00:00:00,400\nこれは短すぎる字幕です\n\n2\n00:00:00,350 --> 00:00:01,800\nCTAと重なる可能性のある長い字幕テキストです');
  const findings = auditCaptions(captions, {fps: 10, durationSeconds: 2, language: 'ja', manifest});
  const codes = new Set(findings.map((finding) => finding.code));
  assert.ok(codes.has('CAPTION_TOO_SHORT'));
  assert.ok(codes.has('CAPTION_OVERLAP'));
  assert.ok(codes.has('CAPTION_LINE_TOO_LONG'));
  assert.ok(codes.has('CAPTION_REGION_COLLISION'));
});

test('platform overlays carry provenance and normalized zones', () => {
  const overlay = getPlatformOverlay('x-ad');
  assert.equal(overlay.id, 'x-video');
  assert.match(overlay.sourceUrl, /^https:/);
  assert.ok(overlay.zones.every((zone) => zone.x + zone.width <= 1 && zone.y + zone.height <= 1));
});

test('source-aware scan maps findings and emits Fix Packets', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'frameproof-source-aware-'));
  try {
    const video = path.join(directory, 'source-aware.mp4');
    const manifestPath = path.join(directory, 'manifest.json');
    const captionsPath = path.join(directory, 'captions.srt');
    const create = await run('ffmpeg', [
      '-v', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=320x180:d=1:r=10',
      '-f', 'lavfi', '-i', 'color=c=gray:s=320x180:d=1:r=10',
      '-filter_complex', '[0:v][1:v]concat=n=2:v=1:a=0[out]', '-map', '[out]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-y', video
    ]);
    assert.equal(create.code, 0, create.stderr);
    await writeFile(manifestPath, JSON.stringify(createManifest(manifestCandidate)), 'utf8');
    await writeFile(captionsPath, '1\n00:00:01,000 --> 00:00:01,300\nCTA字幕が長すぎます', 'utf8');
    const config = await loadConfig(undefined, {checkPlatformMetadata: false, checkEdgeActivity: false, maxFrozenSeconds: .5});
    const report = await scanInput(video, config, {manifestPath, captionsPath});
    const textFinding = report.findings.find((finding) => finding.code === 'TEXT_TOO_SMALL');
    assert.equal(report.context.compositionId, 'Demo');
    assert.equal(textFinding.source.file, 'src/Cta.tsx');
    assert.ok(report.findings.some((finding) => finding.code === 'EXPECTED_MOTION_MISSING'));
    assert.ok(report.fixPackets.some((packet) => packet.source?.file === 'src/Cta.tsx' && packet.verify.includes('--manifest')));
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});

test('audio integrity detects removed dialogue interval', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'frameproof-audio-'));
  try {
    const video = path.join(directory, 'audio-gap.mp4');
    const manifestPath = path.join(directory, 'manifest.json');
    const create = await run('ffmpeg', [
      '-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=320x180:d=3:r=10',
      '-f', 'lavfi', '-i', 'sine=frequency=800:duration=3:sample_rate=48000',
      '-filter_complex', '[1:a]volume=enable=between(t\\,1\\,2):volume=0[a]',
      '-map', '0:v', '-map', '[a]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', '-y', video
    ]);
    assert.equal(create.code, 0, create.stderr);
    const manifest = createManifest({
      compositionId: 'AudioDemo', fps: 10, durationInFrames: 30,
      assertions: [{id: 'dialogue', kind: 'audio', from: 0, to: 29, expected: {maxUnexpectedSilenceMs: 600}, source: 'src/Audio.tsx:12'}]
    });
    await writeFile(manifestPath, JSON.stringify(manifest), 'utf8');
    const config = await loadConfig(undefined, {checkPlatformMetadata: false, checkEdgeActivity: false, checkAudioIntegrity: true, silenceMinimumSeconds: .3});
    const report = await scanInput(video, config, {manifestPath});
    assert.equal(report.audio.hasAudio, true);
    assert.ok(report.audio.silenceIntervals.some((interval) => interval.durationSeconds > .8));
    const finding = report.findings.find((item) => item.code === 'EXPECTED_AUDIO_MISSING');
    assert.equal(finding.source.file, 'src/Audio.tsx');
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});
