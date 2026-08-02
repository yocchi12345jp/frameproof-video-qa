import path from 'node:path';
import {mkdir, access} from 'node:fs/promises';
import {constants} from 'node:fs';
import {runProcess} from './ffmpeg.js';

const exists = async (filePath) => {
  try { await access(filePath, constants.R_OK); return true; } catch { return false; }
};

const representativeTime = (finding, fps) => {
  const frames = finding?.frames ?? [];
  if (!frames.length) return 0;
  return Math.max(0, Math.min(...frames) / (Number(fps) || 30));
};

const extract = async (input, time, output) => {
  await runProcess('ffmpeg', ['-v', 'error', '-y', '-ss', String(time), '-i', input, '-frames:v', '1', '-vf', "scale='min(480,iw)':-2:flags=lanczos", '-q:v', '3', output]);
};

export const generateRevisionFilmstrip = async (revision, {
  currentReport,
  baselineReport,
  outputDir,
  currentInput = currentReport.input,
  baselineInput = baselineReport.input,
  maxItems = 24
}) => {
  await mkdir(outputDir, {recursive: true});
  const currentReadable = currentInput && !String(currentInput).includes('%') && await exists(currentInput);
  const baselineReadable = baselineInput && !String(baselineInput).includes('%') && await exists(baselineInput);
  const selected = revision.items.filter((item) => ['new', 'regressed', 'improved', 'resolved'].includes(item.status)).slice(0, maxItems);
  const assets = [];
  for (let index = 0; index < selected.length; index += 1) {
    const item = selected[index];
    const key = `${String(index + 1).padStart(2, '0')}-${item.status}-${item.fingerprint.slice(0, 8)}`;
    const currentTime = representativeTime(item.current, currentReport.metadata?.fps);
    const baselineTime = representativeTime(item.baseline, baselineReport.metadata?.fps);
    const asset = {fingerprint: item.fingerprint, status: item.status, currentTime, baselineTime};
    if (currentReadable && item.current) {
      const fileName = `${key}-current.jpg`;
      await extract(currentInput, currentTime, path.join(outputDir, fileName));
      asset.current = fileName;
    }
    if (baselineReadable && item.baseline) {
      const fileName = `${key}-baseline.jpg`;
      await extract(baselineInput, baselineTime, path.join(outputDir, fileName));
      asset.baseline = fileName;
    }
    assets.push(asset);
  }
  return {outputDir, assets, currentReadable, baselineReadable};
};
