import {createManifest} from './manifest.js';

const COLLECTOR_KEY = Symbol.for('frameproof.manifest.collector');

const collector = () => globalThis[COLLECTOR_KEY];

export const beginManifestCollection = (metadata) => {
  if (collector()) throw new Error('A FrameProof manifest collection is already active');
  globalThis[COLLECTOR_KEY] = {metadata: {...metadata}, regions: new Map(), assertions: new Map()};
};

export const registerRegion = (region) => {
  const active = collector();
  if (!active) return false;
  active.regions.set(region.id, {...region});
  return true;
};

export const registerAssertion = (kind, assertion) => {
  const active = collector();
  if (!active) return false;
  active.assertions.set(assertion.id, {kind, ...assertion});
  return true;
};

export const endManifestCollection = () => {
  const active = collector();
  if (!active) throw new Error('No FrameProof manifest collection is active');
  delete globalThis[COLLECTOR_KEY];
  return createManifest({
    ...active.metadata,
    regions: [...active.regions.values()],
    assertions: [...active.assertions.values()]
  });
};

export const createManifestBuilder = (metadata) => {
  const regions = new Map();
  const assertions = new Map();
  const api = {
    region(region) { regions.set(region.id, {...region}); return api; },
    expectMotion(assertion) { assertions.set(assertion.id, {kind: 'motion', ...assertion}); return api; },
    expectText(assertion) { assertions.set(assertion.id, {kind: 'text', ...assertion}); return api; },
    expectVisible(assertion) { assertions.set(assertion.id, {kind: 'visible', ...assertion}); return api; },
    expectAudio(assertion) { assertions.set(assertion.id, {kind: 'audio', ...assertion}); return api; },
    expectSafeArea(assertion) { assertions.set(assertion.id, {kind: 'safe-area', ...assertion}); return api; },
    build() { return createManifest({...metadata, regions: [...regions.values()], assertions: [...assertions.values()]}); }
  };
  return api;
};

const component = (kind) => (props) => {
  registerAssertion(kind, props);
  return null;
};

export const Region = (props) => {
  registerRegion(props);
  return null;
};

export const ExpectMotion = component('motion');
export const ExpectText = component('text');
export const ExpectVisible = component('visible');
export const ExpectAudio = component('audio');
export const ExpectSafeArea = component('safe-area');

export const FrameProof = Object.freeze({
  Region,
  ExpectMotion,
  ExpectText,
  ExpectVisible,
  ExpectAudio,
  ExpectSafeArea
});
