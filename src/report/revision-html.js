const esc = (value) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

const time = (finding, report) => {
  const frames = finding?.frames ?? [];
  if (!frames.length) return 'Global';
  const fps = Number(report?.metadata?.fps) || 30;
  return `${(Math.min(...frames) / fps).toFixed(2)}s`;
};

const source = (finding) => finding?.source?.file ? `${finding.source.file}${finding.source.line ? `:${finding.source.line}` : ''}` : '—';

export const renderRevisionHtml = (revision, {currentReport, baselineReport, filmstrip} = {}) => {
  const assetMap = new Map((filmstrip?.assets ?? []).map((asset) => [asset.fingerprint, asset]));
  const cards = revision.items.filter((item) => item.status !== 'unchanged').map((item) => {
    const finding = item.current ?? item.baseline;
    const report = item.current ? currentReport : baselineReport;
    const asset = assetMap.get(item.fingerprint);
    const images = asset ? `<div class="frames">
      <figure>${asset.baseline ? `<img src="${esc(asset.baseline)}" alt="Baseline frame">` : '<div class="empty">No baseline frame</div>'}<figcaption>Baseline · ${esc(asset.baselineTime?.toFixed(2) ?? '—')}s</figcaption></figure>
      <figure>${asset.current ? `<img src="${esc(asset.current)}" alt="Current frame">` : '<div class="empty">No current frame</div>'}<figcaption>Current · ${esc(asset.currentTime?.toFixed(2) ?? '—')}s</figcaption></figure>
    </div>` : '';
    return `<article class="change ${esc(item.status)}"><div class="change-head"><span class="status">${esc(item.status)}</span><span class="severity ${esc(finding?.severity)}">${esc(finding?.severity ?? '—')}</span><code>${esc(finding?.code)}</code><span>${esc(time(finding, report))}</span></div><h3>${esc(finding?.message)}</h3><p class="source">${esc(source(finding))}</p>${images}<details><summary>Comparison details</summary><pre>${esc(JSON.stringify(item.change, null, 2))}</pre></details></article>`;
  }).join('\n');
  const s = revision.summary;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FrameProof revision report</title><style>
:root{color-scheme:light dark;--bg:#f6f8fa;--surface:#fff;--text:#1f2328;--muted:#59636e;--border:#d0d7de;--blue:#0969da;--red:#cf222e;--orange:#9a6700;--green:#1a7f37;--purple:#8250df;--gray:#6e7781}@media(prefers-color-scheme:dark){:root{--bg:#0d1117;--surface:#161b22;--text:#f0f6fc;--muted:#9198a1;--border:#30363d;--blue:#4493f8;--red:#ff7b72;--orange:#d29922;--green:#3fb950;--purple:#a371f7;--gray:#8c959f}}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:1180px;margin:36px auto;padding:0 20px}header,.panel,.change{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:16px}h1{margin:0 0 6px;font-size:28px}.muted,.source{color:var(--muted)}.gate{font-weight:800;color:${s.passed ? 'var(--green)' : 'var(--red)'}}.metrics{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:10px;margin-top:18px}.metric{border:1px solid var(--border);border-radius:9px;padding:12px}.metric span{display:block;color:var(--muted);font-size:12px}.metric strong{font-size:22px}.changes{display:flex;flex-direction:column;gap:12px}.change{margin:0;border-left:5px solid var(--gray)}.change.new,.change.regressed{border-left-color:var(--red)}.change.improved,.change.resolved{border-left-color:var(--green)}.change.accepted{border-left-color:var(--purple)}.change-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;color:var(--muted);font-size:12px}.status,.severity{border-radius:999px;padding:3px 8px;font-weight:700;background:var(--bg)}.status{color:var(--blue)}.severity.error{color:var(--red)}.severity.warning{color:var(--orange)}h3{font-size:16px;margin:12px 0 6px}.frames{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}figure{margin:0}img,.empty{width:100%;aspect-ratio:16/9;object-fit:contain;background:#050505;border:1px solid var(--border);border-radius:8px}.empty{display:grid;place-items:center;color:var(--muted)}figcaption{font-size:12px;color:var(--muted);padding-top:5px}summary{cursor:pointer;color:var(--blue);font-weight:600}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;font:11px ui-monospace,SFMono-Regular,Menlo,monospace}@media(max-width:900px){.metrics{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:640px){.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.frames{grid-template-columns:1fr}}
</style></head><body><main><header><h1>FrameProof revision report</h1><div class="gate">${s.passed ? 'PASSED' : 'FAILED'}</div><p class="muted">Baseline: ${esc(revision.baseline.input)}<br>Current: ${esc(revision.current.input)}</p><div class="metrics"><div class="metric"><span>New</span><strong>${s.new}</strong></div><div class="metric"><span>Regressed</span><strong>${s.regressed}</strong></div><div class="metric"><span>Improved</span><strong>${s.improved}</strong></div><div class="metric"><span>Resolved</span><strong>${s.resolved}</strong></div><div class="metric"><span>Accepted</span><strong>${s.accepted}</strong></div><div class="metric"><span>Unchanged</span><strong>${s.unchanged}</strong></div><div class="metric"><span>Blocking</span><strong>${s.blocking}</strong></div></div></header><section class="panel"><h2>Changed findings</h2>${cards ? `<div class="changes">${cards}</div>` : '<p class="muted">No changed findings.</p>'}</section></main></body></html>`;
};
