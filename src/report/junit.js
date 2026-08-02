const xml = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');

export const renderJunit = (report, {suiteName = 'FrameProof Video QA', includeAccepted = false} = {}) => {
  const findings = (report.findings ?? []).filter((finding) => includeAccepted || finding.revision?.status !== 'accepted');
  const errors = findings.filter((finding) => finding.severity === 'error').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const cases = findings.length ? findings.map((finding, index) => {
    const name = `${finding.code} ${finding.frames?.length ? `@ frame ${Math.min(...finding.frames)}` : '@ global'}`;
    const body = finding.severity === 'error'
      ? `<failure message="${xml(finding.message)}" type="${xml(finding.code)}">${xml(JSON.stringify({source: finding.source, details: finding.details, revision: finding.revision}, null, 2))}</failure>`
      : `<system-out>${xml(JSON.stringify({message: finding.message, source: finding.source, details: finding.details, revision: finding.revision}, null, 2))}</system-out>`;
    return `<testcase classname="frameproof.${xml(finding.code)}" name="${xml(name)}" time="0">${body}</testcase>`;
  }).join('') : '<testcase classname="frameproof" name="no-findings" time="0" />';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="${xml(suiteName)}" tests="${Math.max(1, findings.length)}" failures="${errors}" errors="0" skipped="0" time="0"><properties><property name="warnings" value="${warnings}"/><property name="input" value="${xml(report.input)}"/></properties>${cases}</testsuite>\n`;
};
