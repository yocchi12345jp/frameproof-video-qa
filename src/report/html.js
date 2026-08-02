const htmlEscape = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const sourceLabel = (source) => source?.file ? `${source.file}${source.line ? `:${source.line}` : ''}${source.column ? `:${source.column}` : ''}` : '';
const timeLabel = (frames, fps) => frames?.length ? `${(Math.min(...frames) / fps).toFixed(2)}–${((Math.max(...frames) + 1) / fps).toFixed(2)}s` : 'Global';

export const renderHtmlReport = (report) => {
  const packetMap = new Map((report.fixPackets ?? []).map((packet) => [packet.id, packet]));
  const findingRows = report.findings.map((finding, index) => {
    const packet = packetMap.get(finding.fixPacketId);
    const source = sourceLabel(finding.source);
    return `<article class="finding ${finding.severity}">
<div class="finding-head"><span class="badge ${finding.severity}">${htmlEscape(finding.severity)}</span>${finding.revision?.status ? `<span class="badge revision ${htmlEscape(finding.revision.status)}">${htmlEscape(finding.revision.status)}</span>` : ''}<code>${htmlEscape(finding.code)}</code><span>${htmlEscape(timeLabel(finding.frames, report.metadata.fps))}</span></div>
<h3>${htmlEscape(finding.message)}</h3>
${source ? `<div class="source"><strong>Source</strong><code>${htmlEscape(source)}</code></div>` : ''}
<details><summary>Details and repair packet</summary><div class="detail-grid"><div><h4>Details</h4><pre>${htmlEscape(JSON.stringify(finding.details ?? {}, null, 2))}</pre></div>${packet ? `<div><h4>Fix Packet</h4><pre id="packet-${index}">${htmlEscape(JSON.stringify(packet, null, 2))}</pre><button type="button" data-copy="packet-${index}">Copy Fix Packet</button></div>` : ''}</div></details>
</article>`;
  }).join('\n');

  const revisionSummary = report.revision ? `<section class="panel"><h2>Revision gate</h2><div class="summary compact">
<div class="metric"><span>New</span><strong>${report.revision.summary.new}</strong></div>
<div class="metric"><span>Regressed</span><strong>${report.revision.summary.regressed}</strong></div>
<div class="metric"><span>Resolved</span><strong>${report.revision.summary.resolved}</strong></div>
<div class="metric"><span>Accepted</span><strong>${report.revision.summary.accepted}</strong></div>
</div><p class="${report.revision.summary.passed ? 'pass' : 'fail'}"><strong>${report.revision.summary.passed ? 'No new blocking regressions.' : `${report.revision.summary.blocking} blocking regression(s).`}</strong></p></section>` : '';

  const audioSummary = report.audio ? `<section class="panel"><h2>Audio integrity</h2><div class="summary compact">
<div class="metric"><span>Audio stream</span><strong>${report.audio.hasAudio ? 'Yes' : 'No'}</strong></div>
<div class="metric"><span>Channels</span><strong>${htmlEscape(report.audio.channels ?? '—')}</strong></div>
<div class="metric"><span>Integrated</span><strong>${report.audio.loudness?.integratedLufs !== undefined ? `${report.audio.loudness.integratedLufs.toFixed(1)} LUFS` : '—'}</strong></div>
<div class="metric"><span>True peak</span><strong>${report.audio.loudness?.truePeakDbtp !== undefined ? `${report.audio.loudness.truePeakDbtp.toFixed(1)} dBTP` : '—'}</strong></div>
</div></section>` : '';

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>FrameProof report</title><style>
:root{color-scheme:light dark;--bg:#f6f8fa;--surface:#fff;--text:#1f2328;--muted:#59636e;--border:#d0d7de;--accent:#0969da;--error:#cf222e;--error-bg:#ffebe9;--warning:#9a6700;--warning-bg:#fff8c5;--success:#1a7f37}
@media(prefers-color-scheme:dark){:root{--bg:#0d1117;--surface:#161b22;--text:#f0f6fc;--muted:#9198a1;--border:#30363d;--accent:#4493f8;--error:#ff7b72;--error-bg:#3d171c;--warning:#d29922;--warning-bg:#352a00;--success:#3fb950}}
*{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;background:var(--bg);color:var(--text)}main{max-width:1180px;margin:40px auto;padding:0 20px}header,.panel{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:22px;margin-bottom:18px}h1{margin:0 0 8px;font-size:28px}h2{font-size:18px;margin-top:0}h3{font-size:15px;margin:12px 0}.muted{color:var(--muted)}.summary{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-top:18px}.summary.compact{grid-template-columns:repeat(4,minmax(0,1fr))}.metric{background:color-mix(in srgb,var(--surface) 80%,var(--bg));border:1px solid var(--border);border-radius:9px;padding:14px}.metric strong{display:block;font-size:21px;margin-top:3px}.badge{display:inline-block;border-radius:999px;padding:3px 8px;font-weight:700;font-size:12px}.badge.error{background:var(--error-bg);color:var(--error)}.badge.warning{background:var(--warning-bg);color:var(--warning)}.badge.revision{background:var(--bg);color:var(--accent);border:1px solid var(--border)}.badge.revision.regressed,.badge.revision.new{color:var(--error)}.badge.revision.resolved,.badge.revision.improved{color:var(--success)}.pass{color:var(--success)}.fail{color:var(--error)}code,pre{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.findings{display:flex;flex-direction:column;gap:12px}.finding{background:var(--surface);border:1px solid var(--border);border-left:4px solid var(--warning);border-radius:10px;padding:16px}.finding.error{border-left-color:var(--error)}.finding-head{display:flex;gap:9px;align-items:center;flex-wrap:wrap;color:var(--muted);font-size:12px}.finding h3{font-weight:600}.source{display:flex;gap:10px;align-items:center;color:var(--muted);font-size:13px}.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}.detail-grid>div{min-width:0}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;font-size:11px;max-height:360px;overflow:auto}summary{cursor:pointer;color:var(--accent);font-weight:600}button{border:1px solid var(--border);background:var(--surface);color:var(--text);border-radius:7px;padding:7px 10px;cursor:pointer}button:hover{border-color:var(--accent)}
@media(max-width:760px){.summary,.summary.compact{grid-template-columns:repeat(2,minmax(0,1fr))}.detail-grid{grid-template-columns:1fr}}
</style></head>
<body><main><header><h1>FrameProof Video QA</h1><div class="${report.summary.passed ? 'pass' : 'fail'}"><strong>${report.summary.passed ? 'PASSED' : 'FAILED'}</strong></div>
<div>${htmlEscape(report.input)}</div><div class="muted">${htmlEscape(report.context?.compositionId ? `Composition: ${report.context.compositionId} · ` : '')}${htmlEscape(report.generatedAt)}</div><div class="summary">
<div class="metric"><span>Frames</span><strong>${report.summary.frameCount}</strong></div>
<div class="metric"><span>Size</span><strong>${report.metadata.width}×${report.metadata.height}</strong></div>
<div class="metric"><span>FPS</span><strong>${Number(report.metadata.fps.toFixed(3))}</strong></div>
<div class="metric"><span>Errors</span><strong>${report.summary.errors}</strong></div>
<div class="metric"><span>Warnings</span><strong>${report.summary.warnings}</strong></div>
</div></header>
${revisionSummary}
${audioSummary}
<section class="panel"><h2>Findings</h2>${report.findings.length ? `<div class="findings">${findingRows}</div>` : '<p class="pass"><strong>No findings.</strong></p>'}</section>
</main><script>document.addEventListener('click',async(e)=>{const id=e.target?.dataset?.copy;if(!id)return;await navigator.clipboard.writeText(document.getElementById(id).textContent);e.target.textContent='Copied';setTimeout(()=>e.target.textContent='Copy Fix Packet',1200)});</script></body></html>`;
};
