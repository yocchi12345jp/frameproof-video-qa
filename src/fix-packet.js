const actionCatalog = {
  ASPECT_RATIO_MISMATCH: ['Render the composition at the expected aspect ratio', 'Verify responsive layout variants before rerendering'],
  BLANK_FRAME: ['Inspect the first reported frame for missing assets or opacity transitions', 'Add an explicit background or shorten the empty transition'],
  FROZEN_RUN: ['Confirm whether the hold is intentional', 'Add a declared ExpectMotion assertion or introduce visible progression'],
  EDGE_ACTIVITY: ['Move captions and UI inward', 'Use a platform overlay or larger safe margin'],
  EXPECTED_MOTION_MISSING: ['Inspect the mapped component animation', 'Verify frame-driven animation values and rerender the affected range'],
  TEXT_TOO_SMALL: ['Increase the base font size', 'Reduce line length or use a responsive layout variant'],
  TEXT_TOO_MANY_LINES: ['Shorten the copy', 'Increase the text container size or reduce line length'],
  EXPECTED_VISIBLE_MISSING: ['Check opacity, z-index, asset loading, and Sequence timing', 'Rerender only the affected frame range'],
  EXPECTED_AUDIO_MISSING: ['Check the audio Sequence timing and source file', 'Verify that the final export contains the expected audio stream'],
  SAFE_AREA_VIOLATION: ['Move the mapped region away from platform UI', 'Use a platform-specific layout variant'],
  CAPTION_TOO_FAST: ['Shorten the caption text', 'Increase its display duration or split it at a semantic boundary'],
  CAPTION_TOO_SHORT: ['Increase caption display duration', 'Merge it with an adjacent caption when appropriate'],
  CAPTION_LINE_TOO_LONG: ['Insert a semantic line break', 'Shorten the caption for the target language'],
  CAPTION_OVERLAP: ['Correct adjacent caption timestamps', 'Ensure only one caption cue is active at a time'],
  CAPTION_REGION_COLLISION: ['Move the caption or declared UI region', 'Use the platform-safe caption layout'],
  NO_AUDIO_STREAM: ['Verify the render includes the audio track', 'Inspect the final exported file rather than only the preview'],
  UNEXPECTED_SILENCE: ['Inspect the mapped dialogue/audio Sequence', 'Check gain, mute state, and source duration'],
  AUDIO_LOUDNESS_OUT_OF_RANGE: ['Normalize loudness for the destination profile', 'Recheck integrated loudness after export'],
  AUDIO_TRUE_PEAK_TOO_HIGH: ['Lower the master gain or add a limiter', 'Recheck true peak after export']
};

const inferredExpectedActual = (finding) => {
  const details = finding.details ?? {};
  const expected = details.expected ?? Object.fromEntries(Object.entries(details).filter(([key]) => /^(minimum|maximum|threshold|required|allowed|expected)/i.test(key)));
  const actual = details.actual ?? Object.fromEntries(Object.entries(details).filter(([key]) => /^(actual|measured|estimated|duration|average|peak)/i.test(key)));
  return {expected, actual};
};

const quote = (value) => JSON.stringify(String(value));

export const createFixPacket = (finding, report) => {
  const {expected, actual} = inferredExpectedActual(finding);
  const frames = finding.frames?.length ? {from: Math.min(...finding.frames), to: Math.max(...finding.frames)} : undefined;
  const manifestArg = report.context?.manifestPath ? ` --manifest ${quote(report.context.manifestPath)}` : '';
  const captionArg = report.context?.captionsPath ? ` --captions ${quote(report.context.captionsPath)}` : '';
  const frameArg = frames ? ` --max-frames ${frames.to + 1}` : '';
  return {
    schemaVersion: '1.0',
    id: `${finding.code}:${frames?.from ?? 'global'}:${frames?.to ?? 'global'}`,
    ruleId: finding.code,
    severity: finding.severity,
    message: finding.message,
    frames,
    timestampSeconds: frames && report.metadata?.fps ? {from: frames.from / report.metadata.fps, to: frames.to / report.metadata.fps} : undefined,
    source: finding.source,
    contexts: finding.contexts,
    expected: Object.keys(expected).length > 0 ? expected : undefined,
    actual: Object.keys(actual).length > 0 ? actual : undefined,
    suggestedActions: actionCatalog[finding.code] ?? ['Inspect the reported interval and mapped source', 'Apply the smallest change and rerun FrameProof'],
    reproduce: `frameproof scan ${quote(report.input)}${manifestArg}${captionArg}${frameArg} --json .frameproof/reproduce.json`,
    verify: `frameproof scan ${quote(report.input)}${manifestArg}${captionArg} --fail-on-warning`
  };
};

export const attachFixPackets = (report) => {
  const fixPackets = report.findings.map((finding) => createFixPacket(finding, report));
  const byId = new Map(fixPackets.map((packet) => [packet.id, packet]));
  return {
    ...report,
    findings: report.findings.map((finding, index) => ({...finding, fixPacketId: fixPackets[index].id})),
    fixPackets: [...byId.values()]
  };
};
