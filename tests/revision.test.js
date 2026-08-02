import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdtemp, readFile, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {spawn} from 'node:child_process';
import {
  acceptanceTemplateForFinding,
  compareReports,
  findingFingerprint,
  validateAcceptances,
  violationMetric
} from '../src/revision.js';
import {renderRevisionMarkdown} from '../src/report/markdown.js';
import {renderSarif} from '../src/report/sarif.js';
import {renderJunit} from '../src/report/junit.js';
import {generateRevisionFilmstrip} from '../src/filmstrip.js';

const report = ({input = 'video.mp4', findings = []} = {}) => ({
  schemaVersion: '2.1',
  toolVersion: '0.5.0',
  generatedAt: '2026-08-02T00:00:00.000Z',
  input,
  metadata: {fps: 30, durationSeconds: 10, width: 1920, height: 1080},
  context: {mode: 'source-aware', compositionId: 'Demo'},
  summary: {frameCount: 300, errors: findings.filter((item) => item.severity === 'error').length, warnings: findings.filter((item) => item.severity === 'warning').length},
  findings,
  fixPackets: []
});

const finding = (code, severity, details, {file = 'src/Scene.tsx', line = 10, frames = [30, 31, 32]} = {}) => ({
  code, severity, message: `${code} message`, frames, details, source: {file, line, component: 'Scene'}
});

test('revision comparison classifies new, regressed, improved, resolved, and unchanged findings', () => {
  const baseline = report({findings: [
    finding('CAPTION_TOO_FAST', 'warning', {captionId: 'a', actualCharactersPerSecond: 22, maximumCharactersPerSecond: 20}),
    finding('FROZEN_RUN', 'warning', {durationSeconds: 4}, {file: 'src/Hold.tsx', frames: [100, 101]}),
    finding('TEXT_TOO_SMALL', 'error', {assertionId: 'title', actualPx: 22, minimumPx: 44}, {file: 'src/Title.tsx'}),
    finding('CAPTION_LINE_TOO_LONG', 'warning', {captionId: 'same', actualLineLength: 20, maximumLineLength: 16}, {file: 'src/Caption.tsx'})
  ]});
  const current = report({findings: [
    finding('CAPTION_TOO_FAST', 'warning', {captionId: 'a', actualCharactersPerSecond: 30, maximumCharactersPerSecond: 20}),
    finding('TEXT_TOO_SMALL', 'warning', {assertionId: 'title', actualPx: 36, minimumPx: 44}, {file: 'src/Title.tsx'}),
    finding('CAPTION_LINE_TOO_LONG', 'warning', {captionId: 'same', actualLineLength: 20, maximumLineLength: 16}, {file: 'src/Caption.tsx'}),
    finding('CAPTION_OVERLAP', 'error', {captionId: 'new', overlapMs: 100}, {file: 'src/New.tsx', frames: [210, 211]})
  ]});
  const revision = compareReports(current, baseline, {schemaVersion: '1.0', acceptances: []});
  assert.equal(revision.summary.regressed, 1);
  assert.equal(revision.summary.improved, 1);
  assert.equal(revision.summary.unchanged, 1);
  assert.equal(revision.summary.new, 1);
  assert.equal(revision.summary.resolved, 1);
  assert.equal(revision.summary.blocking, 1);
  assert.equal(revision.summary.passed, false);
});

test('accepted findings are carried by semantic match and removed from revision blocking', () => {
  const currentFinding = finding('CAPTION_OVERLAP', 'error', {captionId: 'cta', overlapMs: 120}, {file: 'src/Cta.tsx'});
  const current = report({findings: [currentFinding]});
  const baseline = report({findings: []});
  const acceptance = acceptanceTemplateForFinding(currentFinding, current, {reason: 'Intentional overlap'});
  const revision = compareReports(current, baseline, validateAcceptances({schemaVersion: '1.0', acceptances: [acceptance]}));
  assert.equal(revision.summary.accepted, 1);
  assert.equal(revision.summary.blocking, 0);
  assert.equal(revision.summary.passed, true);
  assert.equal(revision.currentFindings[0].revision.status, 'accepted');
});

test('revision metrics understand source-aware v0.4 finding payloads', () => {
  assert.equal(violationMetric({code: 'TEXT_TOO_SMALL', details: {minimumPx: 32, actual: {fontSizePx: 22}}}), 10);
  assert.equal(violationMetric({code: 'TEXT_TOO_MANY_LINES', details: {maximumLines: 2, actual: {lineCount: 3}}}), 1);
  assert.equal(violationMetric({code: 'EXPECTED_MOTION_MISSING', details: {minimumChange: 0.02, actual: {averageChange: 0}}}), 0.02);
  assert.equal(violationMetric({code: 'UNEXPECTED_SILENCE', details: {maximumSilenceSeconds: 0.5, actual: {durationSeconds: 0.81}}}), 0.31);
});

test('finding fingerprints remain stable for the same semantic finding', () => {
  const a = finding('TEXT_TOO_SMALL', 'error', {assertionId: 'headline', actualPx: 20, minimumPx: 44});
  const b = {...a, message: 'localized message', details: {...a.details, actualPx: 21}};
  const r = report({findings: [a]});
  assert.equal(findingFingerprint(a, r), findingFingerprint(b, r));
});

test('revision outputs are machine-readable', () => {
  const currentFinding = finding('TEXT_TOO_SMALL', 'error', {assertionId: 'headline', actualPx: 20, minimumPx: 44});
  const baseline = report({findings: []});
  const current = report({findings: [currentFinding]});
  const revision = compareReports(current, baseline, {schemaVersion: '1.0', acceptances: []});
  const enriched = {...current, findings: revision.currentFindings, revision};
  const sarif = renderSarif(enriched);
  assert.equal(sarif.version, '2.1.0');
  assert.equal(sarif.runs[0].results[0].ruleId, 'TEXT_TOO_SMALL');
  assert.equal(sarif.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri, 'src/Scene.tsx');
  assert.match(renderJunit(enriched), /<failure/);
  assert.match(renderRevisionMarkdown(revision), /Regressed|New/);
});

test('filmstrip extracts representative baseline and current frames', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'frameproof-filmstrip-'));
  const video = path.resolve('examples/demo/failing.mp4');
  const baselineFinding = finding('FROZEN_RUN', 'warning', {durationSeconds: 3}, {frames: [1]});
  const currentFinding = finding('FROZEN_RUN', 'error', {durationSeconds: 5}, {frames: [2]});
  const baseline = report({input: video, findings: [baselineFinding]});
  const current = report({input: video, findings: [currentFinding]});
  const revision = compareReports(current, baseline, {schemaVersion: '1.0', acceptances: []});
  const result = await generateRevisionFilmstrip(revision, {currentReport: current, baselineReport: baseline, outputDir: dir});
  assert.equal(result.assets.length, 1);
  assert.ok(result.assets[0].baseline);
  assert.ok(result.assets[0].current);
  assert.ok((await readFile(path.join(dir, result.assets[0].current))).length > 0);
});

test('CLI compare writes revision, markdown, SARIF, and JUnit outputs', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'frameproof-compare-'));
  const baseline = report({findings: []});
  const current = report({findings: [finding('CAPTION_OVERLAP', 'error', {captionId: 'new', overlapMs: 50})]});
  const baselinePath = path.join(dir, 'baseline.json');
  const currentPath = path.join(dir, 'current.json');
  await writeFile(baselinePath, JSON.stringify(baseline));
  await writeFile(currentPath, JSON.stringify(current));
  const args = ['src/cli.js', 'compare', currentPath, '--baseline', baselinePath, '--json', path.join(dir, 'revision.json'), '--markdown', path.join(dir, 'summary.md'), '--sarif', path.join(dir, 'report.sarif'), '--junit', path.join(dir, 'report.xml')];
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {cwd: path.resolve('.')});
    child.on('error', reject);
    child.on('close', resolve);
  });
  assert.equal(code, 1);
  assert.equal(JSON.parse(await readFile(path.join(dir, 'revision.json'), 'utf8')).summary.new, 1);
  assert.match(await readFile(path.join(dir, 'summary.md'), 'utf8'), /Revision gate failed/);
  assert.equal(JSON.parse(await readFile(path.join(dir, 'report.sarif'), 'utf8')).version, '2.1.0');
  assert.match(await readFile(path.join(dir, 'report.xml'), 'utf8'), /testsuite/);
});
