import {createServer} from 'node:http';
import {constants, createReadStream, createWriteStream} from 'node:fs';
import {access, mkdir, readFile, readdir, stat, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID, timingSafeEqual} from 'node:crypto';
import {spawn} from 'node:child_process';
import {defaultConfig, loadConfig} from './config.js';
import {getToolVersion, probeInput} from './ffmpeg.js';
import {listPresets} from './presets.js';
import {renderHtmlReport} from './report/html.js';
import {renderRevisionHtml} from './report/revision-html.js';
import {renderRevisionMarkdown} from './report/markdown.js';
import {renderSarif} from './report/sarif.js';
import {renderJunit} from './report/junit.js';
import {scanInput} from './scan.js';
import {listPlatformOverlays} from './platform-overlays.js';
import {acceptanceTemplateForFinding, compareReports, loadAcceptances, validateAcceptances} from './revision.js';
import {VERSION} from './version.js';
import {createRepairCommands, createRepairSession, saveRepairSession} from './repair.js';
import {renderRepairHtml} from './report/repair-html.js';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const studioDir = path.resolve(moduleDir, '../studio');
const MAX_JSON_BYTES = 2 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024 * 1024;
const MIME_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8',
  '.sarif': 'application/sarif+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
});

const securityHeaders = Object.freeze({
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self'; script-src 'self'; connect-src 'self'"
});


const parseCookies = (header = '') => Object.fromEntries(header.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
  const index = part.indexOf('=');
  return index === -1 ? [part, ''] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
}));

const tokenMatches = (actual, expected) => {
  if (typeof actual !== 'string') return false;
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
};

const loopbackHost = (hostHeader) => {
  const value = String(hostHeader ?? '').toLowerCase();
  const hostname = value.startsWith('[') ? value.slice(0, value.indexOf(']') + 1) : value.split(':')[0];
  return ['127.0.0.1', 'localhost', '[::1]'].includes(hostname);
};

const send = (response, status, body, headers = {}) => {
  response.writeHead(status, {...securityHeaders, ...headers});
  response.end(body);
};

const sendJson = (response, status, value) => send(
  response,
  status,
  `${JSON.stringify(value)}\n`,
  {'Content-Type': 'application/json; charset=utf-8'}
);

const readJson = async (request) => {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > MAX_JSON_BYTES) throw new Error('Request body is too large');
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
};

const fileExists = async (filePath) => {
  try { await access(filePath, constants.F_OK); return true; } catch { return false; }
};

const resolveOptionalPath = async (value, reportDir, {allowMissing = false} = {}) => {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const raw = value.trim();
  const candidates = path.isAbsolute(raw) ? [raw] : [path.join(reportDir, path.basename(raw)), path.resolve(raw)];
  for (const candidate of candidates) if (await fileExists(candidate)) return candidate;
  if (allowMissing) return path.isAbsolute(raw) ? raw : path.resolve(raw);
  throw new Error(`File not found: ${raw}`);
};

const withRevision = (report, revision, baselinePath, acceptancesPath) => ({
  ...report,
  findings: revision.currentFindings,
  revision,
  context: {...report.context, baselineReportPath: baselinePath, acceptancesPath},
  summary: {...report.summary, accepted: revision.summary.accepted, revisionBlocking: revision.summary.blocking, revisionPassed: revision.summary.passed}
});

const safeFilename = (value, fallback = 'video.mp4') => {
  const decoded = decodeURIComponent(String(value || fallback));
  const cleaned = path.basename(decoded).replace(/[^a-zA-Z0-9._-]+/g, '-');
  return cleaned || fallback;
};

const formatReportName = (input) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const stem = path.basename(input, path.extname(input)).replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 80) || 'scan';
  return `${timestamp}-${stem}`;
};

const summarizeReport = (report, fileName) => ({
  fileName,
  generatedAt: report.generatedAt,
  input: report.input,
  summary: report.summary,
  metadata: report.metadata,
  config: {preset: report.config?.preset, expectedAspect: report.config?.expectedAspect}
});

const openBrowser = (url) => {
  const platform = process.platform;
  const command = platform === 'win32' ? 'cmd' : platform === 'darwin' ? 'open' : 'xdg-open';
  const args = platform === 'win32' ? ['/c', 'start', '', url] : [url];
  const child = spawn(command, args, {detached: true, stdio: 'ignore'});
  child.unref();
};

const contentRange = (rangeHeader, fileSize) => {
  if (!rangeHeader?.startsWith('bytes=')) return undefined;
  const [startText, endText] = rangeHeader.slice(6).split('-');
  const start = startText ? Number(startText) : 0;
  const end = endText ? Number(endText) : fileSize - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= fileSize) return undefined;
  return {start, end: Math.min(end, fileSize - 1)};
};

const serveFile = async (response, filePath, contentType) => {
  try {
    const content = await readFile(filePath);
    send(response, 200, content, {'Content-Type': contentType});
  } catch {
    sendJson(response, 404, {error: 'Not found'});
  }
};

export const createStudioServer = async ({
  host = '127.0.0.1',
  port = 4318,
  reportDir = path.resolve('.frameproof/reports'),
  open = true
} = {}) => {
  await mkdir(reportDir, {recursive: true});
  const uploadDir = path.join(tmpdir(), `frameproof-studio-${process.pid}`);
  await mkdir(uploadDir, {recursive: true});
  const media = new Map();
  const sessionToken = randomUUID();
  const sessionCookie = `frameproof_session=${encodeURIComponent(sessionToken)}; HttpOnly; SameSite=Strict; Path=/`;

  const registerMedia = async (filePath, displayName = path.basename(filePath)) => {
    const id = randomUUID();
    const metadata = await probeInput(filePath, 30);
    media.set(id, {path: filePath, displayName, metadata});
    return {id, name: displayName, metadata, mediaUrl: `/api/media/${id}`};
  };

  const listRecent = async () => {
    const entries = (await readdir(reportDir, {withFileTypes: true}))
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json') && !entry.name.endsWith('.revision.json'));
    const rows = [];
    for (const entry of entries) {
      try {
        const raw = await readFile(path.join(reportDir, entry.name), 'utf8');
        rows.push(summarizeReport(JSON.parse(raw), entry.name));
      } catch {
        // Ignore incomplete or manually edited reports.
      }
    }
    return rows.toSorted((a, b) => b.generatedAt.localeCompare(a.generatedAt)).slice(0, 30);
  };

  const server = createServer(async (request, response) => {
    try {
      if (!loopbackHost(request.headers.host)) return sendJson(response, 403, {error: 'Studio only accepts loopback Host headers'});
      const url = new URL(request.url || '/', `http://${host}`);
      const pathname = decodeURIComponent(url.pathname);
      const isApi = pathname.startsWith('/api/');
      if (isApi) {
        const cookies = parseCookies(request.headers.cookie);
        const suppliedToken = request.headers['x-frameproof-session'] ?? cookies.frameproof_session;
        if (!tokenMatches(suppliedToken, sessionToken)) return sendJson(response, 401, {error: 'Invalid or missing Studio session token'});
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method ?? 'GET')) {
          const origin = request.headers.origin;
          if (origin && origin !== `http://${request.headers.host}`) return sendJson(response, 403, {error: 'Cross-origin Studio request rejected'});
        }
      }

      if (request.method === 'GET' && pathname === '/api/bootstrap') {
        const [ffmpeg, ffprobe] = await Promise.allSettled([
          getToolVersion('ffmpeg'),
          getToolVersion('ffprobe')
        ]);
        return sendJson(response, 200, {
          version: VERSION,
          defaults: defaultConfig,
          presets: listPresets(),
          overlays: listPlatformOverlays(),
          environment: {
            node: process.version,
            ffmpeg: ffmpeg.status === 'fulfilled' ? ffmpeg.value : undefined,
            ffprobe: ffprobe.status === 'fulfilled' ? ffprobe.value : undefined,
            ready: ffmpeg.status === 'fulfilled' && ffprobe.status === 'fulfilled'
          },
          reportDirectory: reportDir
        });
      }

      if (request.method === 'GET' && pathname === '/api/recent') {
        return sendJson(response, 200, {reports: await listRecent()});
      }

      if (request.method === 'POST' && pathname === '/api/register-path') {
        const body = await readJson(request);
        if (typeof body.path !== 'string' || body.path.trim() === '') {
          return sendJson(response, 400, {error: 'A file path is required'});
        }
        const resolved = path.resolve(body.path);
        const info = await stat(resolved);
        if (!info.isFile()) return sendJson(response, 400, {error: 'The selected path is not a file'});
        return sendJson(response, 200, await registerMedia(resolved));
      }

      if (request.method === 'POST' && pathname === '/api/upload') {
        const declaredLength = Number(request.headers['content-length'] || 0);
        if (declaredLength > MAX_UPLOAD_BYTES) return sendJson(response, 413, {error: 'File exceeds the 4 GB Studio limit'});
        const fileName = safeFilename(request.headers['x-file-name']);
        const target = path.join(uploadDir, `${randomUUID()}-${fileName}`);
        const output = createWriteStream(target, {flags: 'wx'});
        let bytes = 0;
        for await (const chunk of request) {
          bytes += chunk.length;
          if (bytes > MAX_UPLOAD_BYTES) {
            output.destroy(new Error('File exceeds the 4 GB Studio limit'));
            return sendJson(response, 413, {error: 'File exceeds the 4 GB Studio limit'});
          }
          if (!output.write(chunk)) await new Promise((resolve) => output.once('drain', resolve));
        }
        output.end();
        await new Promise((resolve, reject) => {
          output.once('finish', resolve);
          output.once('error', reject);
        });
        return sendJson(response, 200, await registerMedia(target, fileName));
      }

      if (request.method === 'POST' && pathname === '/api/scan') {
        const body = await readJson(request);
        const selected = body.mediaId ? media.get(body.mediaId) : undefined;
        const input = selected?.path || (typeof body.inputPath === 'string' ? path.resolve(body.inputPath) : undefined);
        if (!input) return sendJson(response, 400, {error: 'Select or register a video first'});
        const config = await loadConfig(undefined, body.config || {});
        const manifestPath = await resolveOptionalPath(body.manifestPath, reportDir);
        const captionsPath = await resolveOptionalPath(body.captionsPath, reportDir);
        const baselineReportPath = await resolveOptionalPath(body.baselineReportPath, reportDir);
        const acceptancesPath = await resolveOptionalPath(body.acceptancesPath, reportDir, {allowMissing: true});
        if (manifestPath) { const info = await stat(manifestPath); if (!info.isFile()) return sendJson(response, 400, {error: 'Manifest path is not a file'}); }
        if (captionsPath) { const info = await stat(captionsPath); if (!info.isFile()) return sendJson(response, 400, {error: 'Captions path is not a file'}); }
        const scanAbort = new AbortController();
        const cancelScan = () => { if (!response.writableEnded) scanAbort.abort(); };
        response.once('close', cancelScan);
        let report;
        try { report = await scanInput(input, config, {manifestPath, captionsPath, signal: scanAbort.signal}); }
        finally { response.removeListener('close', cancelScan); }
        let baselineReport;
        let revision;
        if (baselineReportPath) {
          baselineReport = JSON.parse(await readFile(baselineReportPath, 'utf8'));
          const acceptances = acceptancesPath && await fileExists(acceptancesPath)
            ? await loadAcceptances(acceptancesPath)
            : validateAcceptances({schemaVersion: '1.0', acceptances: []});
          revision = compareReports(report, baselineReport, acceptances);
          report = withRevision(report, revision, baselineReportPath, acceptancesPath);
        }
        const reportName = formatReportName(selected?.displayName || input);
        const jsonName = `${reportName}.json`;
        const htmlName = `${reportName}.html`;
        const artifacts = {json: `/api/report-file/${encodeURIComponent(jsonName)}`, html: `/api/report-file/${encodeURIComponent(htmlName)}`, jsonName, htmlName};
        const writes = [
          writeFile(path.join(reportDir, jsonName), `${JSON.stringify(report, null, 2)}\n`, 'utf8'),
          writeFile(path.join(reportDir, htmlName), renderHtmlReport(report), 'utf8')
        ];
        if (revision) {
          const revisionName = `${reportName}.revision.json`;
          const revisionHtmlName = `${reportName}.revision.html`;
          const markdownName = `${reportName}.md`;
          const sarifName = `${reportName}.sarif`;
          const junitName = `${reportName}.xml`;
          Object.assign(artifacts, {
            revisionJson: `/api/report-file/${encodeURIComponent(revisionName)}`, revisionHtml: `/api/report-file/${encodeURIComponent(revisionHtmlName)}`,
            markdown: `/api/report-file/${encodeURIComponent(markdownName)}`, sarif: `/api/report-file/${encodeURIComponent(sarifName)}`, junit: `/api/report-file/${encodeURIComponent(junitName)}`,
            revisionName, revisionHtmlName, markdownName, sarifName, junitName
          });
          writes.push(
            writeFile(path.join(reportDir, revisionName), `${JSON.stringify(revision, null, 2)}\n`, 'utf8'),
            writeFile(path.join(reportDir, revisionHtmlName), renderRevisionHtml(revision, {currentReport: report, baselineReport}), 'utf8'),
            writeFile(path.join(reportDir, markdownName), renderRevisionMarkdown(revision), 'utf8'),
            writeFile(path.join(reportDir, sarifName), `${JSON.stringify(renderSarif(report), null, 2)}\n`, 'utf8'),
            writeFile(path.join(reportDir, junitName), renderJunit(report), 'utf8')
          );
        }
        await Promise.all(writes);
        return sendJson(response, 200, {
          report,
          mediaUrl: body.mediaId ? `/api/media/${body.mediaId}` : undefined,
          artifacts,
          failed: revision
            ? !revision.summary.passed || (Boolean(body.failOnWarning) && revision.summary.warningRegressions > 0)
            : report.summary.errors > 0 || (Boolean(body.failOnWarning) && report.summary.warnings > 0)
        });
      }



      if (request.method === 'POST' && pathname === '/api/repair-plan') {
        const body = await readJson(request);
        const reportFileName = path.basename(String(body.reportFileName || ''));
        if (!reportFileName.endsWith('.json')) return sendJson(response, 400, {error: 'A saved JSON report is required'});
        const reportPath = path.join(reportDir, reportFileName);
        const report = JSON.parse(await readFile(reportPath, 'utf8'));
        const projectRoot = body.projectRoot || report.manifest?.projectRoot;
        if (!projectRoot) return sendJson(response, 400, {error: 'A project root is required because this report has no manifest projectRoot'});
        const session = await createRepairSession(report, {
          reportPath,
          projectRoot,
          agent: body.agent === 'claude' ? 'claude' : 'codex',
          includeWarnings: Boolean(body.includeWarnings),
          allowedFiles: Array.isArray(body.allowedFiles) ? body.allowedFiles : undefined,
          renderCommand: typeof body.renderCommand === 'string' && body.renderCommand.trim() ? body.renderCommand.trim() : undefined,
          fullRenderCommand: typeof body.fullRenderCommand === 'string' && body.fullRenderCommand.trim() ? body.fullRenderCommand.trim() : undefined,
          outputVideo: typeof body.outputVideo === 'string' && body.outputVideo.trim() ? body.outputVideo.trim() : undefined
        });
        if (session.allowedFiles.length === 0) {
          return sendJson(response, 409, {
            code: 'REPAIR_SOURCE_UNMAPPED',
            error: 'No source file could be mapped for this repair. Add source mapping in the Render Manifest or use the CLI with an explicit --allow-file/--allow-directory scope.'
          });
        }
        const repairDir = path.join(reportDir, 'repairs', session.id);
        await mkdir(repairDir, {recursive: true});
        const sessionPath = path.join(repairDir, 'session.json');
        const promptPath = path.join(repairDir, 'prompt.md');
        const htmlPath = path.join(repairDir, 'repair.html');
        await Promise.all([
          saveRepairSession(sessionPath, session),
          writeFile(promptPath, session.prompt, 'utf8'),
          writeFile(htmlPath, renderRepairHtml(session), 'utf8')
        ]);
        const relativeBase = `repairs/${session.id}`;
        return sendJson(response, 200, {
          session,
          commands: createRepairCommands(session, sessionPath),
          artifacts: {
            sessionPath,
            promptPath,
            html: `/api/report-file/${encodeURIComponent(`${relativeBase}/repair.html`)}`,
            session: `/api/report-file/${encodeURIComponent(`${relativeBase}/session.json`)}`,
            prompt: `/api/report-file/${encodeURIComponent(`${relativeBase}/prompt.md`)}`
          }
        });
      }

      if (request.method === 'POST' && pathname === '/api/acceptance') {
        const body = await readJson(request);
        const reportFileName = path.basename(String(body.reportFileName || ''));
        if (!reportFileName.endsWith('.json')) return sendJson(response, 400, {error: 'A saved JSON report is required'});
        const report = JSON.parse(await readFile(path.join(reportDir, reportFileName), 'utf8'));
        const index = Number(body.findingIndex);
        const finding = report.findings?.[index];
        if (!finding) return sendJson(response, 400, {error: 'Finding index does not exist'});
        const acceptancesPath = await resolveOptionalPath(body.acceptancesPath || '.frameproof/acceptances.json', reportDir, {allowMissing: true});
        const acceptanceFile = acceptancesPath && await fileExists(acceptancesPath)
          ? await loadAcceptances(acceptancesPath)
          : validateAcceptances({schemaVersion: '1.0', acceptances: []});
        const acceptance = acceptanceTemplateForFinding(finding, report, {reason: body.reason || 'Reviewed in FrameProof Studio', owner: body.owner});
        if (!acceptanceFile.acceptances.some((entry) => entry.fingerprint === acceptance.fingerprint)) acceptanceFile.acceptances.push(acceptance);
        await mkdir(path.dirname(acceptancesPath), {recursive: true});
        await writeFile(acceptancesPath, `${JSON.stringify(acceptanceFile, null, 2)}\n`, 'utf8');
        return sendJson(response, 200, {acceptance, acceptancesPath, count: acceptanceFile.acceptances.length});
      }

      if (request.method === 'GET' && pathname.startsWith('/api/media/')) {
        const id = pathname.slice('/api/media/'.length);
        const selected = media.get(id);
        if (!selected) return sendJson(response, 404, {error: 'Media is no longer available in this session'});
        const info = await stat(selected.path);
        const range = contentRange(request.headers.range, info.size);
        const headers = {
          'Accept-Ranges': 'bytes',
          'Content-Type': 'video/mp4',
          'Content-Disposition': `inline; filename="${safeFilename(selected.displayName)}"`
        };
        if (range) {
          response.writeHead(206, {
            ...securityHeaders,
            ...headers,
            'Content-Range': `bytes ${range.start}-${range.end}/${info.size}`,
            'Content-Length': range.end - range.start + 1
          });
          return createReadStream(selected.path, {start: range.start, end: range.end}).pipe(response);
        }
        response.writeHead(200, {...securityHeaders, ...headers, 'Content-Length': info.size});
        return createReadStream(selected.path).pipe(response);
      }

      if (request.method === 'GET' && pathname.startsWith('/api/report-file/')) {
        const relative = pathname.slice('/api/report-file/'.length).replaceAll('\\', '/');
        const normalized = path.posix.normalize(relative).replace(/^\.\.\//, '');
        if (normalized.startsWith('../') || path.isAbsolute(normalized)) return sendJson(response, 400, {error: 'Invalid report path'});
        if (!['.json', '.html', '.md', '.sarif', '.xml'].includes(path.extname(normalized))) return sendJson(response, 400, {error: 'Unsupported report type'});
        const filePath = path.resolve(reportDir, normalized);
        if (!filePath.startsWith(path.resolve(reportDir) + path.sep)) return sendJson(response, 400, {error: 'Invalid report path'});
        const type = MIME_TYPES[path.extname(normalized)] || 'application/octet-stream';
        return serveFile(response, filePath, type);
      }

      if (request.method === 'GET' && pathname.startsWith('/api/report/')) {
        const fileName = path.basename(pathname.slice('/api/report/'.length));
        if (!fileName.endsWith('.json')) return sendJson(response, 400, {error: 'JSON report required'});
        const raw = await readFile(path.join(reportDir, fileName), 'utf8');
        return send(response, 200, raw, {'Content-Type': 'application/json; charset=utf-8'});
      }

      if (request.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
        try {
          const content = await readFile(path.join(studioDir, 'index.html'));
          return send(response, 200, content, {'Content-Type': MIME_TYPES['.html'], 'Set-Cookie': sessionCookie, 'Cache-Control': 'no-store'});
        } catch { return sendJson(response, 404, {error: 'Not found'}); }
      }

      if (request.method === 'GET' && ['/styles.css', '/app.js'].includes(pathname)) {
        const filePath = path.join(studioDir, pathname.slice(1));
        return serveFile(response, filePath, MIME_TYPES[path.extname(filePath)] || 'application/octet-stream');
      }

      return sendJson(response, 404, {error: 'Not found'});
    } catch (error) {
      return sendJson(response, 500, {error: error instanceof Error ? error.message : String(error)});
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });

  const address = server.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;
  const url = `http://${host}:${actualPort}`;
  if (open) {
    try {
      openBrowser(url);
    } catch {
      // A browser can still be opened manually.
    }
  }

  return {server, url, reportDir, uploadDir, sessionToken, authHeaders: {'X-FrameProof-Session': sessionToken}, sessionCookie: `frameproof_session=${encodeURIComponent(sessionToken)}`};
};
