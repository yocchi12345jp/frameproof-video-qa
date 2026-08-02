import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {access} from 'node:fs/promises';
import {constants} from 'node:fs';
import {loadProjectSettings} from './onboarding.js';
import {loadConfig} from './config.js';
import {scanInput} from './scan.js';
import {compareReports, loadAcceptances, validateAcceptances} from './revision.js';
import {renderHtmlReport} from './report/html.js';
import {renderRevisionHtml} from './report/revision-html.js';
import {renderRevisionMarkdown} from './report/markdown.js';
import {renderSarif} from './report/sarif.js';
import {renderJunit} from './report/junit.js';

const exists = async (filePath) => { try { await access(filePath, constants.F_OK); return true; } catch { return false; } };
const writeJson = (filePath, value) => writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');

const resolveOptional = async (root, value) => {
  if (!value) return undefined;
  const resolved = path.resolve(root, value);
  return await exists(resolved) ? resolved : undefined;
};

export const verifyProject = async ({projectRoot = process.cwd(), input, artifactsDir, useBaseline = true, failOnWarning, preset} = {}) => {
  const {root, project} = await loadProjectSettings(projectRoot);
  const video = path.resolve(root, input || project.input);
  if (!await exists(video)) throw new Error(`Rendered video not found: ${video}`);
  const outputRoot = path.resolve(root, artifactsDir || project.artifactsDir || '.frameproof/artifacts', 'latest');
  await mkdir(outputRoot, {recursive: true});
  const configPath = await resolveOptional(root, project.config);
  const manifestPath = await resolveOptional(root, project.manifest);
  const captionsPath = await resolveOptional(root, project.captions);
  const config = await loadConfig(configPath, {preset: preset || project.preset || undefined});
  let report = await scanInput(video, config, {manifestPath, captionsPath});
  let revision;
  let baselineReport;
  const baselinePath = useBaseline ? await resolveOptional(root, project.baseline) : undefined;
  if (baselinePath) {
    baselineReport = JSON.parse(await readFile(baselinePath, 'utf8'));
    const acceptancePath = await resolveOptional(root, project.acceptances);
    const acceptances = acceptancePath ? await loadAcceptances(acceptancePath) : validateAcceptances({schemaVersion: '1.0', acceptances: []});
    revision = compareReports(report, baselineReport, acceptances);
    report = {
      ...report,
      findings: revision.currentFindings,
      revision,
      summary: {...report.summary, accepted: revision.summary.accepted, revisionBlocking: revision.summary.blocking, revisionPassed: revision.summary.passed}
    };
  }
  const paths = {
    json: path.join(outputRoot, 'report.json'), html: path.join(outputRoot, 'report.html'), fixPackets: path.join(outputRoot, 'fix-packets.json'),
    sarif: path.join(outputRoot, 'frameproof.sarif'), junit: path.join(outputRoot, 'frameproof.junit.xml')
  };
  await Promise.all([
    writeJson(paths.json, report),
    writeFile(paths.html, renderHtmlReport(report), 'utf8'),
    writeJson(paths.fixPackets, {schemaVersion: '1.0', generatedAt: report.generatedAt, input: report.input, fixPackets: report.fixPackets ?? []}),
    writeJson(paths.sarif, renderSarif(report)),
    writeFile(paths.junit, renderJunit(report), 'utf8')
  ]);
  if (revision) {
    Object.assign(paths, {revisionJson: path.join(outputRoot, 'revision.json'), revisionHtml: path.join(outputRoot, 'revision.html'), markdown: path.join(outputRoot, 'summary.md')});
    await Promise.all([
      writeJson(paths.revisionJson, revision),
      writeFile(paths.revisionHtml, renderRevisionHtml(revision, {currentReport: report, baselineReport}), 'utf8'),
      writeFile(paths.markdown, renderRevisionMarkdown(revision), 'utf8')
    ]);
  }
  const warningGate = failOnWarning ?? project.failOnWarning ?? false;
  const passed = revision ? revision.summary.passed && (!warningGate || revision.summary.warningRegressions === 0) : report.summary.errors === 0 && (!warningGate || report.summary.warnings === 0);
  const summary = {schemaVersion: '1.0', generatedAt: new Date().toISOString(), video, baseline: baselinePath, passed, report: report.summary, revision: revision?.summary, artifacts: paths};
  await writeJson(path.join(outputRoot, 'verification.json'), summary);
  return {root, project, report, revision, passed, outputRoot, paths, summary};
};
