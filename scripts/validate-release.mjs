import {readFile, access} from 'node:fs/promises';

const requiredFiles = [
  'START_STUDIO.cmd',
  'START_STUDIO.sh',
  'action.yml',
  'AGENTS.md',
  'CLAUDE.md',
  'docs/AGENT_COMPATIBILITY.md',
  'docs/AGENT_MAINTENANCE.md',
  'skills/generated-video-auditor/SKILL.md',
  'skills/generated-video-auditor/scripts/audit-video.mjs',
  'docs/PLATFORM_PRESETS.md',
  'docs/STUDIO.md',
  'docs/UX_RESEARCH.md',
  'docs/images/studio-mobile.png',
  'docs/images/studio-result.png',
  'docs/images/studio-scan.png',
  'docs/images/studio-dashboard-ja.png',
  'docs/images/studio-dashboard.png',
  'docs/USABILITY_AUDIT.md',
  'docs/frameproof-manifest.schema.json',
  'docs/REMOTION_INTEGRATION.md',
  'src/manifest.js',
  'src/assertions.js',
  'src/captions.js',
  'src/audio.js',
  'src/fix-packet.js',
  'src/revision.js',
  'src/filmstrip.js',
  'src/report/revision-html.js',
  'src/report/sarif.js',
  'src/report/junit.js',
  'docs/REVISION_WORKFLOW.md',
  'docs/CI_OUTPUTS.md',
  'docs/V0_5_IMPLEMENTATION_AUDIT.md',
  'src/repair.js',
  'src/report/repair-html.js',
  'docs/REPAIR_LOOP.md',
  'docs/V0_6_IMPLEMENTATION_AUDIT.md',
  'examples/repair/README.md',
  'src/doctor.js',
  'src/onboarding.js',
  'src/workflow.js',
  'docs/ONBOARDING.md',
  'docs/DOCTOR.md',
  'docs/NPM_TRUSTED_PUBLISHING.md',
  'docs/V0_7_IMPLEMENTATION_AUDIT.md',
  'src/preflight.js',
  'src/render-health.js',
  'src/report/render-receipt-html.js',
  'docs/PREFLIGHT.md',
  'docs/RENDER_HEALTH.md',
  'docs/THREAT_MODEL.md',
  'SECURITY.md',
  'src/command-spec.js',
  'docs/V0_8_IMPLEMENTATION_AUDIT.md',
  'examples/onboarding/README.md',
  'examples/render-health/README.md',
  '.github/workflows/publish.yml',
  'scripts/smoke-package-install.mjs',
  'studio/index.html',
  'studio/styles.css',
  'studio/app.js'
];

for (const file of requiredFiles) await access(file);

const skill = await readFile('skills/generated-video-auditor/SKILL.md', 'utf8');
const frontmatter = skill.match(/^---\n([\s\S]*?)\n---\n/);
if (!frontmatter) throw new Error('SKILL.md must begin with YAML frontmatter');
if (!/^name:\s*generated-video-auditor\s*$/m.test(frontmatter[1])) throw new Error('SKILL.md name is missing or invalid');
if (!/^description:\s*\S.+$/m.test(frontmatter[1])) throw new Error('SKILL.md description is missing');

const action = await readFile('action.yml', 'utf8');
for (const fragment of ['name:', 'description:', 'runs:', 'using: composite', 'video:', 'json-report:', 'html-report:', 'repair-session:', 'repair-agent:']) {
  if (!action.includes(fragment)) throw new Error(`action.yml is missing: ${fragment}`);
}

const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
if (packageJson.version !== '0.8.1') throw new Error('package.json version must be 0.8.1');
if (!packageJson.files?.includes('skills') || !packageJson.files?.includes('action.yml') || !packageJson.files?.includes('AGENTS.md') || !packageJson.files?.includes('CLAUDE.md') || !packageJson.files?.includes('studio') || !packageJson.files?.includes('docs/frameproof-manifest.schema.json') || !packageJson.files?.includes('docs/ONBOARDING.md') || !packageJson.files?.includes('docs/DOCTOR.md') || !packageJson.files?.includes('docs/PREFLIGHT.md') || !packageJson.files?.includes('docs/RENDER_HEALTH.md')) {
  throw new Error('npm package must include Studio, onboarding docs, the Agent Skill, and action metadata');
}

const publishWorkflow = await readFile('.github/workflows/publish.yml', 'utf8');
for (const fragment of ['id-token: write', "node-version: '24'", 'Verify release tag matches package version', 'npm run check:package', 'Check whether this version is already published', 'npm publish --access public --tag beta --registry=https://registry.npmjs.org']) {
  if (!publishWorkflow.includes(fragment)) throw new Error(`publish.yml is missing: ${fragment}`);
}


const maintainedWorkflowFiles = [
  '.github/workflows/ci.yml',
  '.github/workflows/publish.yml',
  'examples/remotion-ci.yml',
  'examples/revision/github-actions.yml'
];
for (const file of maintainedWorkflowFiles) {
  const source = await readFile(file, 'utf8');
  for (const match of source.matchAll(/uses:\s*([^\s#]+)@([^\s#]+)/g)) {
    const actionName = match[1];
    const ref = match[2];
    if (actionName === './' || actionName.startsWith('yocchi12345jp/frameproof-video-qa')) continue;
    if (!/^[0-9a-f]{40}$/.test(ref)) throw new Error(`${file} uses mutable third-party Action ref: ${actionName}@${ref}`);
  }
}

const threatModel = await readFile('docs/THREAT_MODEL.md', 'utf8');
for (const fragment of ['stale-output', 'session token', 'allow-unmapped', 'maximum decoded-frame budget']) {
  if (!threatModel.includes(fragment)) throw new Error(`THREAT_MODEL.md is missing current control: ${fragment}`);
}

console.log('Release metadata validation passed.');
