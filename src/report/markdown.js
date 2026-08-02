const esc = (value) => String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
const sourceLabel = (finding) => finding?.source?.file ? `${finding.source.file}${finding.source.line ? `:${finding.source.line}` : ''}` : '—';
const timeLabel = (finding, fps = 30) => {
  const frames = finding?.frames ?? [];
  if (!frames.length) return 'Global';
  return `${(Math.min(...frames) / fps).toFixed(2)}s`;
};

export const renderRevisionMarkdown = (revision, {title = 'FrameProof revision report'} = {}) => {
  const summary = revision.summary;
  const rows = revision.items.filter((item) => item.status !== 'unchanged').map((item) => {
    const finding = item.current ?? item.baseline;
    const fps = item.current ? revision.current.fps : revision.baseline.fps;
    return `| ${item.status} | ${finding?.severity ?? '—'} | \`${esc(finding?.code)}\` | ${esc(finding?.message)} | ${esc(sourceLabel(finding))} | ${timeLabel(finding, fps)} |`;
  });
  return `## ${title}

${summary.passed ? '✅ **Revision gate passed**' : '❌ **Revision gate failed**'}

| New | Regressed | Improved | Resolved | Accepted | Unchanged | Blocking |
|---:|---:|---:|---:|---:|---:|---:|
| ${summary.new} | ${summary.regressed} | ${summary.improved} | ${summary.resolved} | ${summary.accepted} | ${summary.unchanged} | ${summary.blocking} |

${rows.length ? `### Changes

| Status | Severity | Rule | Finding | Source | Time |
|---|---|---|---|---|---|
${rows.join('\n')}` : 'No changed findings.'}
`;
};
