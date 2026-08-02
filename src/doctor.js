import {spawn} from 'node:child_process';
import {access, readFile} from 'node:fs/promises';
import path from 'node:path';
import {constants} from 'node:fs';
import {VERSION} from './version.js';

const exists = async (filePath) => {
  try { await access(filePath, constants.F_OK); return true; } catch { return false; }
};

const firstLine = (value) => String(value ?? '').trim().split(/\r?\n/, 1)[0] || '';

const runVersion = (command, args) => new Promise((resolve) => {
  const child = spawn(command, args, {stdio: ['ignore', 'pipe', 'pipe']});
  const stdout = [];
  const stderr = [];
  let settled = false;
  const finish = (value) => { if (!settled) { settled = true; resolve(value); } };
  child.stdout?.on('data', (chunk) => stdout.push(chunk));
  child.stderr?.on('data', (chunk) => stderr.push(chunk));
  child.on('error', (error) => finish({available: false, command, error: error.code === 'ENOENT' ? 'not found' : error.message}));
  child.on('close', (code) => {
    const output = firstLine(Buffer.concat(stdout).toString('utf8')) || firstLine(Buffer.concat(stderr).toString('utf8'));
    finish({available: code === 0, command, version: output || undefined, exitCode: code});
  });
});

const toolChecks = [
  ['ffmpeg', ['-version'], true],
  ['ffprobe', ['-version'], true],
  ['git', ['--version'], true],
  ['npm', ['--version'], false],
  ['codex', ['--version'], false],
  ['claude', ['--version'], false]
];

const readPackage = async (projectRoot) => {
  const packagePath = path.join(projectRoot, 'package.json');
  if (!await exists(packagePath)) return undefined;
  try { return JSON.parse(await readFile(packagePath, 'utf8')); } catch { return {invalid: true}; }
};

const detectProjectType = (packageJson) => {
  if (!packageJson || packageJson.invalid) return 'generic';
  const dependencies = {...packageJson.dependencies, ...packageJson.devDependencies};
  if (dependencies.remotion || Object.keys(dependencies).some((name) => name.startsWith('@remotion/'))) return 'remotion';
  return 'generic';
};

export const diagnoseEnvironment = async ({projectRoot = process.cwd()} = {}) => {
  const root = path.resolve(projectRoot);
  const packageJson = await readPackage(root);
  const tools = await Promise.all(toolChecks.map(async ([command, args, required]) => ({...(await runVersion(command, args)), required})));
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  const projectFile = path.join(root, '.frameproof', 'project.json');
  const configFile = path.join(root, 'frameproof.config.json');
  const checks = [
    {id: 'node', label: 'Node.js >=20', status: nodeMajor >= 20 ? 'pass' : 'fail', detail: process.version, required: true},
    ...tools.map((tool) => ({
      id: tool.command,
      label: tool.command,
      status: tool.available ? 'pass' : (tool.required ? 'fail' : 'optional'),
      detail: tool.version ?? tool.error ?? 'not found',
      required: tool.required
    })),
    {id: 'project', label: 'FrameProof project', status: await exists(projectFile) ? 'pass' : 'warning', detail: await exists(projectFile) ? projectFile : 'Run frameproof init', required: false},
    {id: 'config', label: 'FrameProof config', status: await exists(configFile) ? 'pass' : 'optional', detail: await exists(configFile) ? configFile : 'using built-in defaults', required: false}
  ];
  const requiredFailures = checks.filter((check) => check.required && check.status === 'fail');
  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    frameproofVersion: VERSION,
    platform: {os: process.platform, arch: process.arch, node: process.version},
    project: {root, type: detectProjectType(packageJson), packageManager: await detectPackageManager(root), packageJson: Boolean(packageJson && !packageJson.invalid)},
    checks,
    ready: requiredFailures.length === 0,
    agents: {
      codex: tools.find((tool) => tool.command === 'codex')?.available ?? false,
      claude: tools.find((tool) => tool.command === 'claude')?.available ?? false
    }
  };
};

export const detectPackageManager = async (root) => {
  if (await exists(path.join(root, 'pnpm-lock.yaml'))) return 'pnpm';
  if (await exists(path.join(root, 'yarn.lock'))) return 'yarn';
  if (await exists(path.join(root, 'bun.lockb')) || await exists(path.join(root, 'bun.lock'))) return 'bun';
  return 'npm';
};

export const formatDoctorText = (diagnosis) => {
  const marker = (status) => status === 'pass' ? '✓' : status === 'fail' ? '✗' : status === 'warning' ? '!' : '·';
  const lines = [
    `FrameProof ${diagnosis.frameproofVersion} environment`,
    `Project: ${diagnosis.project.root} (${diagnosis.project.type}, ${diagnosis.project.packageManager})`,
    ''
  ];
  for (const check of diagnosis.checks) lines.push(`${marker(check.status)} ${check.label}: ${check.detail}`);
  lines.push('', diagnosis.ready ? 'Required environment is ready.' : 'Required environment is not ready. Fix failed checks before scanning.');
  if (!diagnosis.agents.codex && !diagnosis.agents.claude) lines.push('Claude Code and Codex are optional for scanning; install either one to use repair execution.');
  return lines.join('\n');
};
