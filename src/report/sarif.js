import {findingFingerprint} from '../revision.js';

const level = (severity) => severity === 'error' ? 'error' : severity === 'warning' ? 'warning' : 'note';
const sourceLocation = (finding) => {
  if (!finding?.source?.file) return undefined;
  return {
    physicalLocation: {
      artifactLocation: {uri: String(finding.source.file).replaceAll('\\', '/')},
      region: {
        startLine: Math.max(1, Number(finding.source.line) || 1),
        ...(finding.source.column ? {startColumn: Math.max(1, Number(finding.source.column))} : {})
      }
    }
  };
};

export const renderSarif = (report, {includeAccepted = false} = {}) => {
  const findings = (report.findings ?? []).filter((finding) => includeAccepted || finding.revision?.status !== 'accepted');
  const codes = [...new Set(findings.map((finding) => finding.code))].toSorted();
  const rules = codes.map((code) => {
    const sample = findings.find((finding) => finding.code === code);
    return {
      id: code,
      name: code,
      shortDescription: {text: code.toLowerCase().replaceAll('_', ' ')},
      fullDescription: {text: sample?.message ?? code},
      help: {text: `FrameProof rule ${code}. Review the source-aware Fix Packet for repair guidance.`},
      defaultConfiguration: {level: level(sample?.severity)}
    };
  });
  return {
    version: '2.1.0',
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    runs: [{
      tool: {driver: {name: 'FrameProof Video QA', informationUri: 'https://github.com/yocchi12345jp/frameproof-video-qa', version: report.toolVersion, rules}},
      automationDetails: {id: report.context?.compositionId ? `frameproof/${report.context.compositionId}/` : 'frameproof/video/'},
      results: findings.map((finding) => {
        const location = sourceLocation(finding);
        const fingerprint = finding.revision?.fingerprint ?? findingFingerprint(finding, report);
        return {
          ruleId: finding.code,
          level: level(finding.severity),
          message: {text: finding.message},
          ...(location ? {locations: [location]} : {}),
          partialFingerprints: {primaryLocationLineHash: fingerprint},
          properties: {
            frameproofStatus: finding.revision?.status ?? 'current',
            frames: finding.frames ?? [],
            fixPacketId: finding.fixPacketId,
            source: finding.source,
            details: finding.details
          }
        };
      })
    }]
  };
};
