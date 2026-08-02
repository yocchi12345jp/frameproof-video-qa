import {execFile} from 'node:child_process';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {promisify} from 'node:util';

const exec = promisify(execFile);
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npmOptions = process.platform === 'win32' ? {shell: true} : {};
const root = process.cwd();
const packDir = await mkdtemp(path.join(os.tmpdir(), 'frameproof-pack-'));
const installDir = await mkdtemp(path.join(os.tmpdir(), 'frameproof-install-'));

try {
  const {stdout} = await exec(npm, ['pack', '--json', '--pack-destination', packDir], {...npmOptions, cwd: root, maxBuffer: 10 * 1024 * 1024});
  const packed = JSON.parse(stdout);
  const tarball = path.join(packDir, packed[0].filename);
  await writeFile(path.join(installDir, 'package.json'), JSON.stringify({name: 'frameproof-smoke', private: true, type: 'module'}, null, 2));
  await exec(npm, ['install', tarball, '--ignore-scripts', '--no-audit', '--no-fund'], {...npmOptions, cwd: installDir, maxBuffer: 10 * 1024 * 1024});
  const packageRoot = path.join(installDir, 'node_modules', 'frameproof-video-qa');
  const pkg = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'));
  if (pkg.version !== '0.8.1') throw new Error(`Installed version mismatch: ${pkg.version}`);
  const cli = path.join(packageRoot, 'src', 'cli.js');
  const version = await exec(process.execPath, [cli, '--version'], {cwd: installDir});
  if (version.stdout.trim() !== '0.8.1') throw new Error(`CLI version mismatch: ${version.stdout.trim()}`);
  const importCheck = await exec(process.execPath, ['--input-type=module', '-e', "import {diagnoseEnvironment,initializeProject,verifyProject,runPreflight,runGuardedRender} from 'frameproof-video-qa'; console.log([diagnoseEnvironment,initializeProject,verifyProject,runPreflight,runGuardedRender].every(Boolean))"], {cwd: installDir});
  if (importCheck.stdout.trim() !== 'true') throw new Error('Public workflow exports are unavailable');
  const preflightRoot = path.join(installDir, 'fixture');
  await import('node:fs/promises').then(({mkdir}) => mkdir(preflightRoot, {recursive: true}));
  await writeFile(path.join(preflightRoot, 'package.json'), JSON.stringify({name:'fixture',private:true,scripts:{render:'node -e \"console.log(1)\"'}}, null, 2));
  const preflight = await exec(process.execPath, [cli, 'preflight', '--project', preflightRoot, '--minimum-free-gb', '0.01', '--json-output'], {cwd: installDir});
  const preflightJson = JSON.parse(preflight.stdout);
  if (!preflightJson.ready) throw new Error('Installed CLI preflight did not pass on the smoke fixture');
  for (const required of ['skills/generated-video-auditor/SKILL.md', 'action.yml', 'docs/ONBOARDING.md', 'docs/DOCTOR.md', 'docs/PREFLIGHT.md', 'docs/RENDER_HEALTH.md', 'examples/render-health/README.md']) {
    await readFile(path.join(packageRoot, required));
  }
  console.log(`Package smoke install passed: ${packed[0].filename} (${packed[0].size} bytes)`);
} finally {
  await Promise.all([rm(packDir, {recursive: true, force: true}), rm(installDir, {recursive: true, force: true})]);
}
