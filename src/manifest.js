import {readFile, writeFile} from 'node:fs/promises';
import {MANIFEST_SCHEMA_VERSION} from './version.js';

const finiteNumber = (value, name, {min = -Infinity, required = true} = {}) => {
  if (value === undefined && !required) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min) {
    throw new Error(`${name} must be a finite number${Number.isFinite(min) ? ` >= ${min}` : ''}`);
  }
  return value;
};

const nonEmptyString = (value, name, {required = true} = {}) => {
  if (value === undefined && !required) return undefined;
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${name} must be a non-empty string`);
  return value.trim();
};

export const normalizeSource = (source) => {
  if (!source) return undefined;
  if (typeof source === 'object' && !Array.isArray(source)) {
    const normalized = {
      composition: source.composition,
      sequence: source.sequence,
      component: source.component,
      file: source.file,
      line: source.line,
      column: source.column
    };
    return Object.fromEntries(Object.entries(normalized).filter(([, value]) => value !== undefined));
  }
  if (typeof source !== 'string') throw new Error('source must be a string or object');
  const match = source.match(/^(.*?):(\d+)(?::(\d+))?$/);
  return match ? {file: match[1], line: Number(match[2]), column: match[3] ? Number(match[3]) : undefined} : {file: source};
};

const validateBox = (box, name) => {
  if (box === undefined) return undefined;
  if (!box || typeof box !== 'object' || Array.isArray(box)) throw new Error(`${name} must be an object`);
  const normalized = {};
  for (const key of ['x', 'y', 'width', 'height']) normalized[key] = finiteNumber(box[key], `${name}.${key}`, {min: 0});
  if (normalized.x + normalized.width > 1.000001 || normalized.y + normalized.height > 1.000001) {
    throw new Error(`${name} must use normalized coordinates inside 0..1`);
  }
  return normalized;
};

const normalizeInterval = (entry, name, durationInFrames) => {
  const from = finiteNumber(entry.from ?? 0, `${name}.from`, {min: 0});
  const to = finiteNumber(entry.to ?? durationInFrames - 1, `${name}.to`, {min: from});
  if (to >= durationInFrames) throw new Error(`${name}.to must be lower than durationInFrames`);
  return {from: Math.floor(from), to: Math.floor(to)};
};

const normalizeRegion = (region, index, manifest) => {
  if (!region || typeof region !== 'object' || Array.isArray(region)) throw new Error(`regions[${index}] must be an object`);
  const interval = normalizeInterval(region, `regions[${index}]`, manifest.durationInFrames);
  return {
    id: nonEmptyString(region.id, `regions[${index}].id`),
    type: nonEmptyString(region.type ?? 'component', `regions[${index}].type`),
    ...interval,
    role: nonEmptyString(region.role, `regions[${index}].role`, {required: false}),
    source: normalizeSource(region.source),
    box: validateBox(region.box, `regions[${index}].box`),
    style: region.style && typeof region.style === 'object' && !Array.isArray(region.style) ? {...region.style} : undefined,
    metadata: region.metadata && typeof region.metadata === 'object' && !Array.isArray(region.metadata) ? {...region.metadata} : undefined
  };
};

const ASSERTION_KINDS = new Set(['motion', 'text', 'visible', 'audio', 'safe-area']);

const normalizeAssertion = (assertion, index, manifest) => {
  if (!assertion || typeof assertion !== 'object' || Array.isArray(assertion)) throw new Error(`assertions[${index}] must be an object`);
  const kind = nonEmptyString(assertion.kind, `assertions[${index}].kind`);
  if (!ASSERTION_KINDS.has(kind)) throw new Error(`assertions[${index}].kind must be one of ${[...ASSERTION_KINDS].join(', ')}`);
  const interval = normalizeInterval(assertion, `assertions[${index}]`, manifest.durationInFrames);
  return {
    id: nonEmptyString(assertion.id, `assertions[${index}].id`),
    kind,
    ...interval,
    regionId: nonEmptyString(assertion.regionId, `assertions[${index}].regionId`, {required: false}),
    source: normalizeSource(assertion.source),
    severity: assertion.severity === 'warning' ? 'warning' : 'error',
    expected: assertion.expected && typeof assertion.expected === 'object' && !Array.isArray(assertion.expected) ? {...assertion.expected} : {},
    actual: assertion.actual && typeof assertion.actual === 'object' && !Array.isArray(assertion.actual) ? {...assertion.actual} : undefined,
    metadata: assertion.metadata && typeof assertion.metadata === 'object' && !Array.isArray(assertion.metadata) ? {...assertion.metadata} : undefined
  };
};

export const validateManifest = (candidate) => {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) throw new Error('Manifest must be an object');
  const schemaVersion = nonEmptyString(candidate.schemaVersion ?? MANIFEST_SCHEMA_VERSION, 'schemaVersion');
  if (schemaVersion !== MANIFEST_SCHEMA_VERSION) throw new Error(`Unsupported manifest schemaVersion: ${schemaVersion}`);
  const manifest = {
    schemaVersion,
    compositionId: nonEmptyString(candidate.compositionId, 'compositionId'),
    fps: finiteNumber(candidate.fps, 'fps', {min: 0.001}),
    durationInFrames: Math.floor(finiteNumber(candidate.durationInFrames, 'durationInFrames', {min: 1})),
    width: candidate.width === undefined ? undefined : Math.floor(finiteNumber(candidate.width, 'width', {min: 1})),
    height: candidate.height === undefined ? undefined : Math.floor(finiteNumber(candidate.height, 'height', {min: 1})),
    generatedAt: candidate.generatedAt ?? new Date().toISOString(),
    projectRoot: nonEmptyString(candidate.projectRoot, 'projectRoot', {required: false}),
    regions: [],
    assertions: [],
    metadata: candidate.metadata && typeof candidate.metadata === 'object' && !Array.isArray(candidate.metadata) ? {...candidate.metadata} : undefined
  };
  manifest.regions = (candidate.regions ?? []).map((region, index) => normalizeRegion(region, index, manifest));
  manifest.assertions = (candidate.assertions ?? []).map((assertion, index) => normalizeAssertion(assertion, index, manifest));

  const ids = new Set();
  for (const item of [...manifest.regions, ...manifest.assertions]) {
    if (ids.has(item.id)) throw new Error(`Duplicate manifest id: ${item.id}`);
    ids.add(item.id);
  }
  const regionIds = new Set(manifest.regions.map((region) => region.id));
  for (const assertion of manifest.assertions) {
    if (assertion.regionId && !regionIds.has(assertion.regionId)) throw new Error(`Assertion ${assertion.id} references missing region ${assertion.regionId}`);
  }
  return manifest;
};

export const createManifest = (candidate) => validateManifest({...candidate, schemaVersion: MANIFEST_SCHEMA_VERSION});

export const loadManifest = async (manifestPath) => validateManifest(JSON.parse(await readFile(manifestPath, 'utf8')));

export const saveManifest = async (manifestPath, manifest) => {
  const validated = validateManifest(manifest);
  await writeFile(manifestPath, `${JSON.stringify(validated, null, 2)}\n`, 'utf8');
  return validated;
};

const overlaps = (fromA, toA, fromB, toB) => fromA <= toB && fromB <= toA;

export const contextsForFrames = (manifest, frames = []) => {
  if (!manifest || frames.length === 0) return [];
  const from = Math.min(...frames);
  const to = Math.max(...frames);
  return manifest.regions.filter((region) => overlaps(region.from, region.to, from, to));
};

export const sourceForFinding = (finding, manifest) => {
  if (finding.source) return normalizeSource(finding.source);
  if (!manifest) return undefined;
  const assertionId = finding.details?.assertionId;
  if (assertionId) {
    const assertion = manifest.assertions.find((item) => item.id === assertionId);
    if (assertion?.source) return assertion.source;
    if (assertion?.regionId) return manifest.regions.find((region) => region.id === assertion.regionId)?.source;
  }
  return contextsForFrames(manifest, finding.frames)[0]?.source;
};

export const enrichFindingsWithManifest = (findings, manifest) => findings.map((finding) => {
  const contexts = contextsForFrames(manifest, finding.frames).map((region) => ({
    id: region.id,
    role: region.role,
    source: region.source,
    from: region.from,
    to: region.to
  }));
  return {
    ...finding,
    source: sourceForFinding(finding, manifest),
    contexts: contexts.length > 0 ? contexts : undefined
  };
});
