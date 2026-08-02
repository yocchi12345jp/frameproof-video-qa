import {access, copyFile, mkdir, readFile, writeFile} from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {detectPackageManager} from './doctor.js';

const exists = async (filePath) => { try { await access(filePath, constants.F_OK); return true; } catch { return false; } };
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const posix = (value) => value.split(path.sep).join('/');

const detectProjectType = async (root) => {
  const packagePath = path.join(root, 'package.json');
  if (!await exists(packagePath)) return 'generic';
  try {
    const pkg = JSON.parse(await readFile(packagePath, 'utf8'));
    const dependencies = {...pkg.dependencies, ...pkg.devDependencies};
    return dependencies.remotion || Object.keys(dependencies).some((name) => name.startsWith('@remotion/')) ? 'remotion' : 'generic';
  } catch { return 'generic'; }
};

const workflowYaml = `name: FrameProof\n\non:\n  pull_request:\n  workflow_dispatch:\n\npermissions:\n  contents: read\n\njobs:\n  video-qa:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2\n      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0\n        with:\n          node-version: 22\n      - name: Install FFmpeg\n        run: sudo apt-get update && sudo apt-get install -y ffmpeg\n      - name: Install project\n        run: npm ci\n      - name: Render video\n        run: npm run render\n      - name: Verify rendered video\n        run: npx --no-install frameproof verify\n      - name: Upload FrameProof artifacts\n        if: always()\n        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2\n        with:\n          name: frameproof\n          path: .frameproof/artifacts/latest\n`;

const manifestTemplate = (root, projectType) => ({
  schemaVersion: '1.0',
  projectRoot: posix(root),
  compositionId: projectType === 'remotion' ? 'ReplaceWithCompositionId' : 'ReplaceWithVideoId',
  durationInFrames: 300,
  fps: 30,
  sourceMap: [],
  assertions: []
});

const defaultConfig = (preset) => ({
  ...(preset ? {preset} : {}),
  checkBlankFrames: true,
  checkFrozenRuns: true,
  checkEdgeActivity: true,
  checkAspect: true,
  checkPlatformMetadata: true,
  checkCaptions: true,
  checkAudioIntegrity: true,
  checkUnexpectedSilence: true
});

export const planProjectInitialization = async ({projectRoot = process.cwd(), projectType, video, preset, artifactsDir = '.frameproof/artifacts', github = false, writePackage = false} = {}) => {
  const root = path.resolve(projectRoot);
  const detectedType = projectType || await detectProjectType(root);
  const packageManager = await detectPackageManager(root);
  const selectedVideo = video || (detectedType === 'remotion' ? 'out/video.mp4' : 'output.mp4');
  const project = {
    schemaVersion: '1.0', projectType: detectedType, input: selectedVideo, preset: preset || null,
    config: 'frameproof.config.json', manifest: null, captions: null,
    baseline: '.frameproof/baseline.json', acceptances: '.frameproof/acceptances.json', artifactsDir,
    failOnWarning: false
  };
  const files = [
    {path: '.frameproof/project.json', content: json(project)},
    {path: '.frameproof/acceptances.json', content: json({schemaVersion: '1.0', acceptances: []})},
    {path: '.frameproof/manifest.example.json', content: json(manifestTemplate(root, detectedType))},
    {path: 'frameproof.config.json', content: json(defaultConfig(preset))},
    {path: '.frameproof/.gitignore', content: 'artifacts/\nrepairs/\nuploads/\n'}
  ];
  if (github) files.push({path: '.github/workflows/frameproof.yml', content: workflowYaml});
  if (writePackage && await exists(path.join(root, 'package.json'))) {
    const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
    pkg.scripts = {...pkg.scripts, 'frameproof:doctor': 'frameproof doctor', 'frameproof:verify': 'frameproof verify', 'frameproof:studio': 'frameproof studio'};
    pkg.devDependencies = {...pkg.devDependencies};
    if (!pkg.dependencies?.['frameproof-video-qa'] && !pkg.devDependencies['frameproof-video-qa']) pkg.devDependencies['frameproof-video-qa'] = '^0.8.1';
    files.push({path: 'package.json', content: json(pkg), overwrite: true});
  }
  return {root, projectType: detectedType, packageManager, project, files};
};

export const initializeProject = async (options = {}) => {
  const plan = await planProjectInitialization(options);
  const created = [];
  const skipped = [];
  for (const file of plan.files) {
    const absolute = path.join(plan.root, file.path);
    if (await exists(absolute) && !options.force && !file.overwrite) { skipped.push(file.path); continue; }
    if (options.dryRun) { created.push(file.path); continue; }
    await mkdir(path.dirname(absolute), {recursive: true});
    await writeFile(absolute, file.content, 'utf8');
    created.push(file.path);
  }
  return {...plan, created, skipped, dryRun: Boolean(options.dryRun)};
};

export const loadProjectSettings = async (projectRoot = process.cwd()) => {
  const root = path.resolve(projectRoot);
  const projectPath = path.join(root, '.frameproof', 'project.json');
  if (!await exists(projectPath)) throw new Error(`FrameProof project is not initialized at ${root}. Run frameproof init.`);
  const project = JSON.parse(await readFile(projectPath, 'utf8'));
  return {root, projectPath, project};
};

export const setBaseline = async (reportPath, {projectRoot = process.cwd(), output, force = false} = {}) => {
  const {root, project} = await loadProjectSettings(projectRoot);
  const source = path.resolve(reportPath);
  if (!await exists(source)) throw new Error(`Report not found: ${source}`);
  const target = path.resolve(root, output || project.baseline || '.frameproof/baseline.json');
  if (await exists(target) && !force) throw new Error(`Baseline already exists: ${target}. Use --force to replace it.`);
  const bytes = await readFile(source);
  const report = JSON.parse(bytes.toString('utf8'));
  if (!report.summary || !report.metadata) throw new Error('The selected file is not a FrameProof report');
  await mkdir(path.dirname(target), {recursive: true});
  await copyFile(source, target);
  const receipt = {
    schemaVersion: '1.0', createdAt: new Date().toISOString(), source, baseline: target,
    reportGeneratedAt: report.generatedAt, input: report.input, summary: report.summary,
    sha256: createHash('sha256').update(bytes).digest('hex')
  };
  const receiptPath = path.join(path.dirname(target), 'baseline-receipt.json');
  await writeFile(receiptPath, json(receipt), 'utf8');
  return {target, receiptPath, receipt};
};

export const baselineStatus = async ({projectRoot = process.cwd()} = {}) => {
  const {root, project} = await loadProjectSettings(projectRoot);
  const target = path.resolve(root, project.baseline || '.frameproof/baseline.json');
  if (!await exists(target)) return {exists: false, target};
  const bytes = await readFile(target);
  const report = JSON.parse(bytes.toString('utf8'));
  return {exists: true, target, sha256: createHash('sha256').update(bytes).digest('hex'), summary: report.summary, generatedAt: report.generatedAt, input: report.input};
};
