import {createHash} from 'node:crypto';
import {access, readFile, stat, statfs} from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {loadConfig} from './config.js';
import {loadManifest} from './manifest.js';
import {getGitSnapshot} from './repair.js';
import {loadProjectSettings} from './onboarding.js';
import {VERSION} from './version.js';

export const PREFLIGHT_SCHEMA_VERSION = '1.0';
const GIB = 1024 ** 3;
const now = () => new Date().toISOString();
const exists = async (filePath) => { try { await access(filePath, constants.F_OK); return true; } catch { return false; } };
const readable = async (filePath) => { try { await access(filePath, constants.R_OK); return true; } catch { return false; } };
const writable = async (filePath) => { try { await access(filePath, constants.W_OK); return true; } catch { return false; } };
const posix = (value) => String(value).replaceAll('\\', '/');

const check = (id, status, label, detail, remediation) => ({id, status, label, detail, remediation});
const hashFile = async (filePath) => {
  try { return createHash('sha256').update(await readFile(filePath)).digest('hex'); } catch { return undefined; }
};

const nearestExistingParent = async (target) => {
  let current = path.resolve(target);
  while (current !== path.dirname(current)) {
    if (await exists(current)) return current;
    current = path.dirname(current);
  }
  return current;
};

const dependencyVersion = (spec) => {
  const match = String(spec ?? '').match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  return match ? {raw: spec, major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3] ?? 0), normalized: `${match[1]}.${match[2]}.${match[3] ?? 0}`} : undefined;
};

const normalizeDeclaredFile = (entry) => {
  if (typeof entry === 'string') return {path: entry, optional: false};
  if (entry && typeof entry === 'object' && typeof entry.path === 'string') return {path: entry.path, optional: Boolean(entry.optional), label: entry.label};
  return undefined;
};

const checkDeclaredFiles = async ({root, entries, kind}) => {
  const checks = [];
  for (const [index, raw] of (entries ?? []).entries()) {
    const entry = normalizeDeclaredFile(raw);
    if (!entry) {
      checks.push(check(`${kind}.${index}`, 'warning', `Invalid ${kind} declaration`, JSON.stringify(raw), `Use a string path or {"path":"...","optional":true}.`));
      continue;
    }
    const absolute = path.resolve(root, entry.path);
    const present = await readable(absolute);
    checks.push(check(
      `${kind}.${index}`,
      present ? 'pass' : entry.optional ? 'warning' : 'error',
      `${kind === 'asset' ? 'Asset' : 'Font'}: ${entry.label ?? entry.path}`,
      present ? posix(path.relative(root, absolute)) : `Missing: ${posix(absolute)}`,
      present ? undefined : entry.optional ? 'Optional file is unavailable; the render may use a fallback.' : `Add the file or mark it optional in manifest.metadata.${kind === 'asset' ? 'assets' : 'fonts'}.`
    ));
  }
  return checks;
};

const loadJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));

export const runPreflight = async ({
  projectRoot = process.cwd(),
  minimumFreeBytes = 2 * GIB,
  renderCommand,
  outputVideo
} = {}) => {
  const root = path.resolve(projectRoot);
  const checks = [];
  const hashes = {};
  let settings;
  try {
    settings = await loadProjectSettings(root);
    checks.push(check('project.settings', 'pass', 'FrameProof project profile', posix(path.relative(root, settings.projectPath))));
    hashes['.frameproof/project.json'] = await hashFile(settings.projectPath);
  } catch (error) {
    checks.push(check('project.settings', 'warning', 'FrameProof project profile', error.message, 'Run `frameproof init` to create a repeatable project profile.'));
  }

  const packagePath = path.join(root, 'package.json');
  let pkg;
  if (await exists(packagePath)) {
    try {
      pkg = await loadJson(packagePath);
      checks.push(check('package.json', 'pass', 'package.json', `${pkg.name ?? 'unnamed'} ${pkg.version ?? ''}`.trim()));
      hashes['package.json'] = await hashFile(packagePath);
    } catch (error) {
      checks.push(check('package.json', 'error', 'package.json', `Invalid JSON: ${error.message}`, 'Repair package.json before rendering.'));
    }
  } else checks.push(check('package.json', 'warning', 'package.json', 'Not found', 'A package file is recommended for reproducible programmatic-video projects.'));

  const lockCandidates = ['package-lock.json', 'npm-shrinkwrap.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lock', 'bun.lockb'];
  const locks = [];
  for (const candidate of lockCandidates) if (await exists(path.join(root, candidate))) locks.push(candidate);
  if (pkg) {
    checks.push(check('dependency.lock', locks.length === 1 ? 'pass' : locks.length === 0 ? 'warning' : 'warning', 'Dependency lockfile', locks.length ? locks.join(', ') : 'No lockfile found', locks.length === 0 ? 'Commit one package-manager lockfile to make renders reproducible.' : locks.length > 1 ? 'Keep only the lockfile used by this project.' : undefined));
    for (const lock of locks) hashes[lock] = await hashFile(path.join(root, lock));
  }

  const dependencies = {...pkg?.dependencies, ...pkg?.devDependencies, ...pkg?.peerDependencies};
  const remotionEntries = Object.entries(dependencies ?? {}).filter(([name]) => name === 'remotion' || name.startsWith('@remotion/'));
  if (remotionEntries.length > 0) {
    const parsed = remotionEntries.map(([name, spec]) => ({name, spec, version: dependencyVersion(spec)}));
    const parseable = parsed.filter((entry) => entry.version);
    const majors = new Set(parseable.map((entry) => entry.version.major));
    const normalized = new Set(parseable.map((entry) => entry.version.normalized));
    const status = majors.size > 1 ? 'error' : normalized.size > 1 ? 'warning' : 'pass';
    checks.push(check(
      'dependencies.remotion', status, 'Remotion package alignment',
      parsed.map((entry) => `${entry.name}@${entry.spec}`).join(', '),
      status === 'error' ? 'Align all remotion and @remotion/* packages to the same major and preferably exact version.' : status === 'warning' ? 'Use the same exact Remotion version across packages to reduce renderer incompatibility.' : undefined
    ));
  } else checks.push(check('dependencies.remotion', 'pass', 'Programmatic-video dependency alignment', 'No Remotion packages detected; generic project mode.'));

  const project = settings?.project ?? {};
  const configPath = project.config ? path.resolve(root, project.config) : path.join(root, 'frameproof.config.json');
  if (await exists(configPath)) {
    try { await loadConfig(configPath); checks.push(check('frameproof.config', 'pass', 'FrameProof configuration', posix(path.relative(root, configPath)))); hashes[posix(path.relative(root, configPath))] = await hashFile(configPath); }
    catch (error) { checks.push(check('frameproof.config', 'error', 'FrameProof configuration', error.message, 'Repair the configuration before rendering.')); }
  } else checks.push(check('frameproof.config', settings ? 'warning' : 'pass', 'FrameProof configuration', 'No config file selected', settings ? 'Create frameproof.config.json or update .frameproof/project.json.' : undefined));

  const manifestPath = project.manifest ? path.resolve(root, project.manifest) : undefined;
  let manifest;
  if (manifestPath) {
    if (!await exists(manifestPath)) checks.push(check('frameproof.manifest', 'error', 'Render manifest', `Missing: ${posix(manifestPath)}`, 'Generate or correct the manifest path before rendering.'));
    else {
      try {
        manifest = await loadManifest(manifestPath);
        checks.push(check('frameproof.manifest', 'pass', 'Render manifest', `${manifest.compositionId} · ${manifest.durationInFrames} frames`));
        hashes[posix(path.relative(root, manifestPath))] = await hashFile(manifestPath);
      } catch (error) { checks.push(check('frameproof.manifest', 'error', 'Render manifest', error.message, 'Repair the manifest before rendering.')); }
    }
  } else checks.push(check('frameproof.manifest', 'pass', 'Render manifest', 'Not configured; file-only verification remains available.'));

  if (manifest?.metadata) {
    checks.push(...await checkDeclaredFiles({root, entries: manifest.metadata.assets, kind: 'asset'}));
    checks.push(...await checkDeclaredFiles({root, entries: manifest.metadata.fonts, kind: 'font'}));
  }

  const selectedRender = renderCommand ?? project.renderCommand ?? pkg?.scripts?.render;
  checks.push(check('render.command', selectedRender ? 'pass' : 'warning', 'Render command', selectedRender ?? 'No render command configured', selectedRender ? undefined : 'Add scripts.render, project.renderCommand, or pass --command to the guarded renderer.'));

  const output = outputVideo ?? project.input;
  if (output) {
    const outputAbsolute = path.resolve(root, output);
    const parent = await nearestExistingParent(path.dirname(outputAbsolute));
    checks.push(check('output.directory', await writable(parent) ? 'pass' : 'error', 'Output directory', posix(parent), await writable(parent) ? undefined : 'Grant write permission or choose another output path.'));
  } else checks.push(check('output.directory', 'warning', 'Output directory', 'No output video path configured', 'Set project.input or pass --output-video.'));

  try {
    const filesystem = await statfs(root);
    const freeBytes = Number(filesystem.bavail) * Number(filesystem.bsize);
    checks.push(check('disk.free', freeBytes >= minimumFreeBytes ? 'pass' : freeBytes >= 512 * 1024 ** 2 ? 'warning' : 'error', 'Free disk space', `${(freeBytes / GIB).toFixed(2)} GiB available`, freeBytes >= minimumFreeBytes ? undefined : `Free at least ${(minimumFreeBytes / GIB).toFixed(1)} GiB or lower --minimum-free-gb intentionally.`));
  } catch (error) { checks.push(check('disk.free', 'warning', 'Free disk space', `Could not measure: ${error.message}`)); }

  const git = await getGitSnapshot(root);
  checks.push(check('git.repository', git.isRepository ? 'pass' : 'warning', 'Git repository', git.isRepository ? `${git.clean ? 'clean' : `${git.changedFiles.length} changed file(s)`}${git.head ? ` · ${git.head.slice(0, 12)}` : ''}` : 'Not a Git repository', git.isRepository ? undefined : 'Git is recommended for source containment, repair review, and approval receipts.'));

  const errors = checks.filter((item) => item.status === 'error').length;
  const warnings = checks.filter((item) => item.status === 'warning').length;
  return {
    schemaVersion: PREFLIGHT_SCHEMA_VERSION,
    frameproofVersion: VERSION,
    generatedAt: now(),
    projectRoot: root,
    ready: errors === 0,
    summary: {errors, warnings, passed: checks.filter((item) => item.status === 'pass').length},
    renderCommand: selectedRender,
    outputVideo: output ? path.resolve(root, output) : undefined,
    hashes: Object.fromEntries(Object.entries(hashes).filter(([, value]) => value)),
    git,
    checks
  };
};

export const formatPreflightText = (result) => {
  const icon = {pass: 'PASS', warning: 'WARN', error: 'FAIL'};
  const lines = [`FrameProof preflight ${result.ready ? 'READY' : 'BLOCKED'}`, `Project: ${result.projectRoot}`, `Checks: ${result.summary.passed} passed · ${result.summary.warnings} warnings · ${result.summary.errors} errors`, ''];
  for (const item of result.checks) {
    lines.push(`[${icon[item.status]}] ${item.label}: ${item.detail}`);
    if (item.remediation) lines.push(`       Fix: ${item.remediation}`);
  }
  return lines.join('\n');
};
