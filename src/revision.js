import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';

export const REVISION_SCHEMA_VERSION = '1.0';
export const ACCEPTANCE_SCHEMA_VERSION = '1.0';

const severityRank = (severity) => severity === 'error' ? 2 : severity === 'warning' ? 1 : 0;
const finite = (value) => Number.isFinite(Number(value)) ? Number(value) : undefined;
const round = (value, digits = 6) => Number(Number(value).toFixed(digits));
const stableIdentifierKeys = [
  'assertionId', 'captionId', 'nextCaptionId', 'regionId', 'elementId', 'trackId',
  'sequenceId', 'componentId', 'ruleId', 'streamIndex', 'channel', 'role'
];

const normalizedSource = (source = {}) => ({
  file: source.file ? String(source.file).replaceAll('\\', '/') : undefined,
  line: finite(source.line),
  column: finite(source.column),
  component: source.component,
  sequence: source.sequence,
  composition: source.composition
});

const timeRange = (finding, report) => {
  const fps = finite(report?.metadata?.fps) || 30;
  const frames = Array.isArray(finding?.frames) ? finding.frames.filter(Number.isFinite) : [];
  if (frames.length === 0) return {from: 0, to: 0, midpoint: 0, normalizedMidpoint: 0};
  const from = Math.min(...frames) / fps;
  const to = (Math.max(...frames) + 1) / fps;
  const duration = finite(report?.metadata?.durationSeconds) || Math.max(to, 0.001);
  return {from: round(from), to: round(to), midpoint: round((from + to) / 2), normalizedMidpoint: round(((from + to) / 2) / duration)};
};

const identityPayload = (finding) => {
  const details = finding?.details ?? {};
  const identifiers = {};
  for (const key of stableIdentifierKeys) {
    if (details[key] !== undefined) identifiers[key] = details[key];
  }
  const contexts = (finding?.contexts ?? []).map((context) => context.id).filter(Boolean).toSorted();
  const source = normalizedSource(finding?.source);
  return {
    code: finding?.code,
    source: {
      file: source.file,
      component: source.component,
      sequence: source.sequence,
      composition: source.composition
    },
    identifiers,
    contexts
  };
};

const hashPayload = (payload) => createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 20);

export const findingIdentityKey = (finding) => hashPayload(identityPayload(finding));

export const findingFingerprint = (finding, report) => {
  const range = timeRange(finding, report);
  return hashPayload({...identityPayload(finding), timeBucket: Math.round(range.normalizedMidpoint * 100)});
};

const metricCatalog = {
  CAPTION_TOO_FAST: (d) => finite(d.actualCharactersPerSecond) / Math.max(finite(d.maximumCharactersPerSecond) || 1, 0.001),
  CAPTION_TOO_SHORT: (d) => (finite(d.minimumDurationMs) || 0) - (finite(d.actualDurationMs) || 0),
  CAPTION_TOO_LONG: (d) => (finite(d.actualDurationMs) || 0) - (finite(d.maximumDurationMs) || 0),
  CAPTION_LINE_TOO_LONG: (d) => (finite(d.actualLineLength) || 0) - (finite(d.maximumLineLength) || 0),
  CAPTION_TOO_MANY_LINES: (d) => (finite(d.actualLines) || 0) - (finite(d.maximumLines) || 0),
  CAPTION_OVERLAP: (d) => finite(d.overlapMs),
  CAPTION_GAP_TOO_SHORT: (d) => (finite(d.minimumGapMs) || 0) - (finite(d.actualGapMs) || 0),
  FROZEN_RUN: (d) => finite(d.durationSeconds) ?? finite(d.actualDurationSeconds),
  EXPECTED_MOTION_MISSING: (d) => (finite(d.minimumChange) ?? finite(d.expected?.minimumChange) ?? finite(d.minimumDifference) ?? finite(d.threshold) ?? 0) - (finite(d.actual?.averageChange) ?? finite(d.actualDifference) ?? finite(d.measuredDifference) ?? 0),
  TEXT_TOO_SMALL: (d) => (finite(d.minimumPx) ?? finite(d.expected?.minimumPx) ?? 0) - (finite(d.actualPx) ?? finite(d.estimatedPx) ?? finite(d.actual?.fontSizePx) ?? finite(d.actual?.estimatedPx) ?? 0),
  TEXT_TOO_MANY_LINES: (d) => (finite(d.actualLines) ?? finite(d.actual?.lineCount) ?? finite(d.actual?.lines) ?? 0) - (finite(d.maximumLines) ?? finite(d.expected?.maximumLines) ?? 0),
  EDGE_ACTIVITY: (d) => (finite(d.actualRatio) || finite(d.measuredRatio) || 0) - (finite(d.maximumRatio) || finite(d.threshold) || 0),
  UNEXPECTED_SILENCE: (d) => (finite(d.durationSeconds) ?? finite(d.actual?.durationSeconds) ?? 0) - (finite(d.maximumSeconds) ?? finite(d.maximumSilenceSeconds) ?? 0),
  AUDIO_TRUE_PEAK_TOO_HIGH: (d) => (finite(d.actualDbtp) || finite(d.actual?.truePeakDbtp) || 0) - (finite(d.maximumDbtp) || finite(d.expected?.maximumTruePeakDbtp) || 0),
  AUDIO_LOUDNESS_OUT_OF_RANGE: (d) => {
    const actual = finite(d.actualLufs) ?? finite(d.actual?.integratedLufs);
    const minimum = finite(d.minimumLufs) ?? finite(d.expected?.minimumIntegratedLufs);
    const maximum = finite(d.maximumLufs) ?? finite(d.expected?.maximumIntegratedLufs);
    if (actual === undefined) return undefined;
    if (minimum !== undefined && actual < minimum) return minimum - actual;
    if (maximum !== undefined && actual > maximum) return actual - maximum;
    return 0;
  }
};

const genericViolationMetric = (details = {}) => {
  const flat = {...details, ...(details.actual && typeof details.actual === 'object' ? details.actual : {}), ...(details.expected && typeof details.expected === 'object' ? details.expected : {})};
  const actualEntry = Object.entries(flat).find(([key, value]) => /^(actual|measured|estimated|duration|average|peak)/i.test(key) && finite(value) !== undefined);
  const maxEntry = Object.entries(flat).find(([key, value]) => /^(maximum|max|allowed|threshold)/i.test(key) && finite(value) !== undefined);
  const minEntry = Object.entries(flat).find(([key, value]) => /^(minimum|min|required)/i.test(key) && finite(value) !== undefined);
  const actual = actualEntry ? finite(actualEntry[1]) : undefined;
  if (actual === undefined) return undefined;
  if (maxEntry) return actual - finite(maxEntry[1]);
  if (minEntry) return finite(minEntry[1]) - actual;
  return actual;
};

export const violationMetric = (finding) => {
  const resolver = metricCatalog[finding?.code];
  const value = resolver ? resolver(finding.details ?? {}) : genericViolationMetric(finding?.details ?? {});
  return Number.isFinite(value) ? round(value) : undefined;
};

const comparison = (current, baseline) => {
  const currentMetric = violationMetric(current);
  const baselineMetric = violationMetric(baseline);
  const severityDelta = severityRank(current.severity) - severityRank(baseline.severity);
  const metricDelta = currentMetric !== undefined && baselineMetric !== undefined ? round(currentMetric - baselineMetric) : undefined;
  const tolerance = baselineMetric === undefined ? 0 : Math.max(0.001, Math.abs(baselineMetric) * 0.05);
  const status = severityDelta > 0 || (metricDelta !== undefined && metricDelta > tolerance)
    ? 'regressed'
    : severityDelta < 0 || (metricDelta !== undefined && metricDelta < -tolerance)
      ? 'improved'
      : 'unchanged';
  return {status, severityDelta, metricDelta, currentMetric, baselineMetric};
};

const acceptanceActive = (acceptance, now = new Date()) => {
  if (!acceptance?.expiresAt) return true;
  const expiresAt = new Date(acceptance.expiresAt);
  return Number.isFinite(expiresAt.getTime()) && expiresAt >= now;
};

const acceptanceMatches = (acceptance, finding, fingerprint) => {
  if (!acceptanceActive(acceptance)) return false;
  if (acceptance.fingerprint && acceptance.fingerprint === fingerprint) return true;
  const match = acceptance.match;
  if (!match || typeof match !== 'object') return false;
  if (match.code && match.code !== finding.code) return false;
  const source = normalizedSource(finding.source);
  if (match.sourceFile && String(match.sourceFile).replaceAll('\\', '/') !== source.file) return false;
  if (match.component && match.component !== source.component) return false;
  if (match.sequence && match.sequence !== source.sequence) return false;
  if (match.composition && match.composition !== source.composition) return false;
  let qualifiers = Number(Boolean(match.sourceFile || match.component || match.sequence || match.composition));
  for (const key of stableIdentifierKeys) {
    if (match[key] !== undefined) { qualifiers += 1; if (finding.details?.[key] !== match[key]) return false; }
  }
  return qualifiers > 0;
};

export const validateAcceptances = (value) => {
  if (!value || typeof value !== 'object') throw new Error('Acceptance file must be a JSON object');
  if (value.schemaVersion && value.schemaVersion !== ACCEPTANCE_SCHEMA_VERSION) throw new Error(`Unsupported acceptance schema: ${value.schemaVersion}`);
  if (!Array.isArray(value.acceptances)) throw new Error('Acceptance file requires an acceptances array');
  return {
    schemaVersion: ACCEPTANCE_SCHEMA_VERSION,
    acceptances: value.acceptances.map((entry, index) => {
      if (!entry || typeof entry !== 'object') throw new Error(`Acceptance ${index + 1} must be an object`);
      if (!entry.fingerprint && !entry.match) throw new Error(`Acceptance ${index + 1} requires fingerprint or match`);
      return {...entry};
    })
  };
};

export const loadAcceptances = async (filePath) => validateAcceptances(JSON.parse(await readFile(filePath, 'utf8')));
export const loadReport = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));

const closestPair = (current, candidates, currentReport, baselineReport) => {
  if (candidates.length === 0) return undefined;
  const currentTime = timeRange(current, currentReport).normalizedMidpoint;
  return candidates.toSorted((a, b) => Math.abs(timeRange(a.finding, baselineReport).normalizedMidpoint - currentTime) - Math.abs(timeRange(b.finding, baselineReport).normalizedMidpoint - currentTime))[0];
};

export const compareReports = (currentReport, baselineReport, acceptanceFile = {schemaVersion: ACCEPTANCE_SCHEMA_VERSION, acceptances: []}) => {
  const acceptances = validateAcceptances(acceptanceFile);
  const baselinePool = (baselineReport.findings ?? []).map((finding, index) => ({finding, index, identity: findingIdentityKey(finding), used: false}));
  const items = [];
  const currentFindings = [];

  for (const finding of currentReport.findings ?? []) {
    const identity = findingIdentityKey(finding);
    const fingerprint = findingFingerprint(finding, currentReport);
    const candidates = baselinePool.filter((entry) => !entry.used && entry.identity === identity);
    const paired = closestPair(finding, candidates, currentReport, baselineReport);
    if (paired) paired.used = true;
    const acceptedBy = acceptances.acceptances.find((entry) => acceptanceMatches(entry, finding, fingerprint));
    const change = paired ? comparison(finding, paired.finding) : {status: 'new'};
    const status = acceptedBy ? 'accepted' : change.status;
    const revision = {
      status,
      fingerprint,
      identity,
      baselineFingerprint: paired ? findingFingerprint(paired.finding, baselineReport) : undefined,
      acceptedBy: acceptedBy ? {reason: acceptedBy.reason, owner: acceptedBy.owner, expiresAt: acceptedBy.expiresAt} : undefined,
      severityDelta: change.severityDelta,
      metricDelta: change.metricDelta,
      currentMetric: change.currentMetric,
      baselineMetric: change.baselineMetric
    };
    const enriched = {...finding, revision};
    currentFindings.push(enriched);
    items.push({status, fingerprint, current: enriched, baseline: paired?.finding, change: revision});
  }

  for (const entry of baselinePool.filter((candidate) => !candidate.used)) {
    const fingerprint = findingFingerprint(entry.finding, baselineReport);
    items.push({status: 'resolved', fingerprint, baseline: entry.finding, change: {status: 'resolved', fingerprint}});
  }

  const counts = Object.fromEntries(['new', 'regressed', 'improved', 'unchanged', 'accepted', 'resolved'].map((status) => [status, items.filter((item) => item.status === status).length]));
  const blockingItems = items.filter((item) => ['new', 'regressed'].includes(item.status) && item.current?.severity === 'error');
  const warningRegressions = items.filter((item) => ['new', 'regressed'].includes(item.status) && item.current?.severity === 'warning');
  return {
    schemaVersion: REVISION_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    baseline: {input: baselineReport.input, generatedAt: baselineReport.generatedAt, schemaVersion: baselineReport.schemaVersion, fps: baselineReport.metadata?.fps, durationSeconds: baselineReport.metadata?.durationSeconds},
    current: {input: currentReport.input, generatedAt: currentReport.generatedAt, schemaVersion: currentReport.schemaVersion, fps: currentReport.metadata?.fps, durationSeconds: currentReport.metadata?.durationSeconds},
    summary: {
      ...counts,
      blocking: blockingItems.length,
      warningRegressions: warningRegressions.length,
      passed: blockingItems.length === 0
    },
    items,
    currentFindings,
    resolvedFindings: items.filter((item) => item.status === 'resolved').map((item) => item.baseline),
    acceptances: {count: acceptances.acceptances.length}
  };
};

export const acceptanceTemplateForFinding = (finding, report, {reason = 'Reviewed and accepted', owner} = {}) => ({
  fingerprint: findingFingerprint(finding, report),
  reason,
  owner,
  match: {
    code: finding.code,
    sourceFile: normalizedSource(finding.source).file,
    ...Object.fromEntries(stableIdentifierKeys.filter((key) => finding.details?.[key] !== undefined).map((key) => [key, finding.details[key]]))
  }
});
