import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdtemp, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {createStudioServer} from '../src/studio-server.js';
import {request as httpRequest} from 'node:http';

const studioFetch = (studio, pathname, options = {}) => fetch(`${studio.url}${pathname}`, {
  ...options,
  headers: {...studio.authHeaders, ...(options.headers ?? {})}
});


test('Studio serves its UI and bootstrap data', async (t) => {
  const reportDir = await mkdtemp(path.join(tmpdir(), 'frameproof-studio-test-'));
  const studio = await createStudioServer({port: 0, open: false, reportDir});
  t.after(() => new Promise((resolve) => studio.server.close(resolve)));

  const page = await fetch(studio.url);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /FrameProof Studio/);

  const bootstrap = await studioFetch(studio, '/api/bootstrap');
  assert.equal(bootstrap.status, 200);
  const payload = await bootstrap.json();
  assert.equal(payload.version, '0.8.1');
  assert.ok(payload.overlays.some((overlay) => overlay.id === 'x-video'));
  assert.ok(Array.isArray(payload.presets));
  assert.equal(typeof payload.defaults.checkBlankFrames, 'boolean');
});

test('Studio registers and scans a local fixture', async (t) => {
  const reportDir = await mkdtemp(path.join(tmpdir(), 'frameproof-studio-scan-'));
  const studio = await createStudioServer({port: 0, open: false, reportDir});
  t.after(() => new Promise((resolve) => studio.server.close(resolve)));
  const fixture = path.resolve('examples/demo/failing.mp4');

  const registeredResponse = await studioFetch(studio, '/api/register-path', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({path: fixture})
  });
  assert.equal(registeredResponse.status, 200);
  const registered = await registeredResponse.json();
  assert.ok(registered.id);
  assert.equal(registered.metadata.width, 320);

  const scanResponse = await studioFetch(studio, '/api/scan', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      mediaId: registered.id,
      config: {
        expectedAspect: '16:9',
        maxFrozenSeconds: 0.5,
        checkEdgeActivity: false,
        checkPlatformMetadata: false
      }
    })
  });
  assert.equal(scanResponse.status, 200);
  const result = await scanResponse.json();
  assert.ok(result.report.summary.frameCount > 0);
  assert.ok(result.artifacts.jsonName.endsWith('.json'));
  const saved = JSON.parse(await readFile(path.join(reportDir, result.artifacts.jsonName), 'utf8'));
  assert.equal(saved.config.checkEdgeActivity, false);
});

test('Studio source-aware scan returns mapped findings and Fix Packets', async (t) => {
  const reportDir = await mkdtemp(path.join(tmpdir(), 'frameproof-studio-source-aware-'));
  const studio = await createStudioServer({port: 0, open: false, reportDir});
  t.after(() => new Promise((resolve) => studio.server.close(resolve)));

  const fixture = path.resolve('examples/source-aware/output/demo.mp4');
  const manifestPath = path.resolve('examples/source-aware/manifest.json');
  const captionsPath = path.resolve('examples/source-aware/captions.srt');
  const registeredResponse = await studioFetch(studio, '/api/register-path', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({path: fixture})
  });
  assert.equal(registeredResponse.status, 200);
  const registered = await registeredResponse.json();

  const scanResponse = await studioFetch(studio, '/api/scan', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      mediaId: registered.id,
      manifestPath,
      captionsPath,
      config: {
        checkAudioIntegrity: true,
        checkUnexpectedSilence: true,
        maxUnexpectedSilenceSeconds: 0.5,
        checkPlatformMetadata: false,
        checkEdgeActivity: false
      }
    })
  });
  assert.equal(scanResponse.status, 200);
  const result = await scanResponse.json();
  assert.equal(result.report.schemaVersion, '2.1');
  assert.equal(result.report.context.compositionId, 'ProductLaunch');
  assert.ok(result.report.findings.some((finding) => finding.source?.file === 'src/scenes/CtaScene.tsx'));
  assert.ok(result.report.findings.some((finding) => finding.code === 'CAPTION_REGION_COLLISION'));
  assert.ok(result.report.fixPackets.length > 0);
});

test('Studio source-aware labels are translatable instead of hard-coded', async () => {
  const html = await readFile(path.resolve('studio/index.html'), 'utf8');
  for (const key of [
    'rule.captions',
    'rule.audio',
    'advanced.sourceAware',
    'advanced.manifest',
    'advanced.captions',
    'advanced.captionLanguage',
    'advanced.platformPreview',
    'advanced.revision',
    'advanced.baseline',
    'advanced.acceptances',
    'summary.sourceMode',
    'summary.revisionMode'
  ]) {
    assert.match(html, new RegExp(`data-i18n=["']${key}["']`));
  }
});

test('Studio compares revisions and persists accepted findings', async (t) => {
  const reportDir = await mkdtemp(path.join(tmpdir(), 'frameproof-studio-revision-'));
  const studio = await createStudioServer({port: 0, open: false, reportDir});
  t.after(() => new Promise((resolve) => studio.server.close(resolve)));
  const fixture = path.resolve('examples/demo/failing.mp4');
  const acceptancesPath = path.join(reportDir, 'acceptances.json');

  const registeredResponse = await studioFetch(studio, '/api/register-path', {
    method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({path: fixture})
  });
  const registered = await registeredResponse.json();

  const baselineResponse = await studioFetch(studio, '/api/scan', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({mediaId: registered.id, config: {maxFrozenSeconds: 0.5, checkEdgeActivity: false, checkPlatformMetadata: false}})
  });
  assert.equal(baselineResponse.status, 200);
  const baseline = await baselineResponse.json();

  const comparisonResponse = await studioFetch(studio, '/api/scan', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      mediaId: registered.id,
      baselineReportPath: baseline.artifacts.jsonName,
      acceptancesPath,
      config: {maxFrozenSeconds: 0.5, checkEdgeActivity: false, checkPlatformMetadata: false}
    })
  });
  assert.equal(comparisonResponse.status, 200);
  const comparison = await comparisonResponse.json();
  assert.ok(comparison.report.revision);
  assert.equal(comparison.report.revision.summary.new, 0);
  assert.ok(comparison.artifacts.revisionHtml.endsWith('.revision.html'));
  assert.ok(comparison.artifacts.sarif.endsWith('.sarif'));

  const acceptanceResponse = await studioFetch(studio, '/api/acceptance', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({reportFileName: comparison.artifacts.jsonName, findingIndex: 0, acceptancesPath})
  });
  assert.equal(acceptanceResponse.status, 200);
  const acceptance = await acceptanceResponse.json();
  assert.equal(acceptance.count, 1);

  const acceptedResponse = await studioFetch(studio, '/api/scan', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      mediaId: registered.id,
      baselineReportPath: baseline.artifacts.jsonName,
      acceptancesPath,
      config: {maxFrozenSeconds: 0.5, checkEdgeActivity: false, checkPlatformMetadata: false}
    })
  });
  const accepted = await acceptedResponse.json();
  assert.ok(accepted.report.revision.summary.accepted >= 1);
});

test('Studio creates a guarded repair plan from a saved source-aware report', async (t) => {
  const reportDir = await mkdtemp(path.join(tmpdir(), 'frameproof-studio-repair-'));
  const projectRoot = await mkdtemp(path.join(tmpdir(), 'frameproof-studio-project-'));
  const studio = await createStudioServer({port: 0, open: false, reportDir});
  t.after(() => new Promise((resolve) => studio.server.close(resolve)));
  const fixture = path.resolve('examples/source-aware/output/demo.mp4');
  const registeredResponse = await studioFetch(studio, '/api/register-path', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({path:fixture})});
  const registered = await registeredResponse.json();
  const scanResponse = await studioFetch(studio, '/api/scan', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({
    mediaId: registered.id,
    manifestPath: path.resolve('examples/source-aware/manifest.json'),
    captionsPath: path.resolve('examples/source-aware/captions.srt'),
    config: {checkAudioIntegrity:true,checkUnexpectedSilence:true,maxUnexpectedSilenceSeconds:0.5,checkPlatformMetadata:false,checkEdgeActivity:false}
  })});
  const scan = await scanResponse.json();
  const planResponse = await studioFetch(studio, '/api/repair-plan', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({
    reportFileName: scan.artifacts.jsonName,
    projectRoot,
    agent:'claude',
    fullRenderCommand:'npm run render -- --output={output}'
  })});
  assert.equal(planResponse.status, 200);
  const plan = await planResponse.json();
  assert.equal(plan.session.agent.name, 'claude');
  assert.ok(plan.session.targets.length > 0);
  assert.match(plan.commands.claude, /--approve-agent/);
  const html = await studioFetch(studio, plan.artifacts.html);
  assert.equal(html.status, 200);
  assert.match(await html.text(), /FrameProof Repair/);
});

test('Studio includes the human-approved repair plan dialog', async () => {
  const html = await readFile(path.resolve('studio/index.html'), 'utf8');
  const app = await readFile(path.resolve('studio/app.js'), 'utf8');
  assert.match(html, /id="repair-dialog"/);
  assert.match(html, /id="create-repair-plan"/);
  assert.match(app, /\/api\/repair-plan/);
  assert.match(app, /Agent repair loop/);
});


test('Studio rejects unauthenticated and cross-origin API requests', async (t) => {
  const reportDir = await mkdtemp(path.join(tmpdir(), 'frameproof-studio-security-'));
  const studio = await createStudioServer({port: 0, open: false, reportDir});
  t.after(() => new Promise((resolve) => studio.server.close(resolve)));

  const unauthenticated = await fetch(`${studio.url}/api/bootstrap`);
  assert.equal(unauthenticated.status, 401);

  const crossOrigin = await fetch(`${studio.url}/api/register-path`, {
    method: 'POST',
    headers: {...studio.authHeaders, 'Content-Type': 'application/json', Origin: 'https://attacker.example'},
    body: JSON.stringify({path: path.resolve('examples/demo/failing.mp4')})
  });
  assert.equal(crossOrigin.status, 403);

  const forgedHostStatus = await new Promise((resolve, reject) => {
    const target = new URL(studio.url);
    const request = httpRequest({hostname: target.hostname, port: target.port, path: '/api/bootstrap', headers: {...studio.authHeaders, Host: 'attacker.example'}}, (response) => {
      response.resume();
      response.on('end', () => resolve(response.statusCode));
    });
    request.on('error', reject);
    request.end();
  });
  assert.equal(forgedHostStatus, 403);
});

test('Studio blocks repair-plan creation when no source scope is mapped', async (t) => {
  const reportDir = await mkdtemp(path.join(tmpdir(), 'frameproof-studio-unmapped-repair-'));
  const projectRoot = await mkdtemp(path.join(tmpdir(), 'frameproof-studio-unmapped-project-'));
  const studio = await createStudioServer({port: 0, open: false, reportDir});
  t.after(() => new Promise((resolve) => studio.server.close(resolve)));
  const fixture = path.resolve('examples/demo/failing.mp4');
  const registeredResponse = await studioFetch(studio, '/api/register-path', {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({path:fixture})
  });
  const registered = await registeredResponse.json();
  const scanResponse = await studioFetch(studio, '/api/scan', {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({
      mediaId:registered.id,
      config:{maxFrozenSeconds:0.5,checkEdgeActivity:false,checkPlatformMetadata:false}
    })
  });
  const scan = await scanResponse.json();
  const planResponse = await studioFetch(studio, '/api/repair-plan', {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({
      reportFileName:scan.artifacts.jsonName, projectRoot, agent:'codex'
    })
  });
  assert.equal(planResponse.status, 409);
  const payload = await planResponse.json();
  assert.equal(payload.code, 'REPAIR_SOURCE_UNMAPPED');
});
