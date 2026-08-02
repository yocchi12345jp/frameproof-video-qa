#!/usr/bin/env node
import {access} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const localCli = fileURLToPath(new URL('../../../src/cli.js', import.meta.url));

const exists = async (path) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const command = await exists(localCli) ? process.execPath : 'npx';
const args = command === process.execPath
  ? [localCli, ...process.argv.slice(2)]
  : ['--yes', 'frameproof-video-qa@latest', ...process.argv.slice(2)];

const child = spawn(command, args, {stdio: 'inherit', shell: false});
child.on('error', (error) => {
  console.error(`Unable to start FrameProof: ${error.message}`);
  process.exitCode = 2;
});
child.on('close', (code) => {
  process.exitCode = code ?? 2;
});
