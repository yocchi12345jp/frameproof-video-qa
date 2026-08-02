const esc = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const status = (receipt) => receipt.result?.passed ? 'Passed' : receipt.result?.blocked ? 'Blocked' : 'Failed';

export const renderRenderReceiptHtml = (receipt) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FrameProof render receipt</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f6f8fa;color:#1f2328;margin:0}main{max-width:1040px;margin:auto;padding:40px 24px}.card{background:#fff;border:1px solid #d0d7de;border-radius:12px;padding:20px;margin:16px 0;box-shadow:0 1px 0 rgba(31,35,40,.04)}h1{font-size:28px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.metric{background:#f6f8fa;border-radius:8px;padding:12px}.pass{color:#1a7f37}.fail{color:#cf222e}.warn{color:#9a6700}code,pre{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}pre{white-space:pre-wrap;overflow:auto;background:#0d1117;color:#e6edf3;padding:16px;border-radius:8px}table{width:100%;border-collapse:collapse}td,th{text-align:left;border-bottom:1px solid #d8dee4;padding:8px}</style></head><body><main>
<h1>FrameProof render receipt</h1><p class="${receipt.result?.passed ? 'pass' : 'fail'}"><strong>${status(receipt)}</strong> · ${esc(receipt.generatedAt)}</p>
<div class="grid"><div class="metric"><strong>Duration</strong><br>${esc(receipt.process?.durationMs)} ms</div><div class="metric"><strong>Exit</strong><br>${esc(receipt.process?.code)}</div><div class="metric"><strong>Max silence</strong><br>${esc(receipt.process?.maxSilenceMs)} ms</div><div class="metric"><strong>Output SHA-256</strong><br><code>${esc(receipt.output?.sha256 ?? 'n/a')}</code></div></div>
<div class="card"><h2>Command</h2><pre>${esc(receipt.command)}</pre></div>
<div class="card"><h2>Advisor</h2><table><thead><tr><th>Category</th><th>Severity</th><th>Evidence</th><th>Action</th></tr></thead><tbody>${(receipt.advisor?.findings ?? []).map((item) => `<tr><td>${esc(item.category)}</td><td>${esc(item.severity)}</td><td>${esc(item.evidence)}</td><td>${esc(item.remediation)}</td></tr>`).join('') || '<tr><td colspan="4">No known render failure signatures detected.</td></tr>'}</tbody></table></div>
<div class="card"><h2>Preflight</h2><p>${esc(receipt.preflight?.summary?.passed ?? 0)} passed · ${esc(receipt.preflight?.summary?.warnings ?? 0)} warnings · ${esc(receipt.preflight?.summary?.errors ?? 0)} errors</p></div>
<div class="card"><h2>Output</h2><pre>${esc(JSON.stringify(receipt.output ?? {}, null, 2))}</pre></div>
<div class="card"><h2>Verification</h2><pre>${esc(JSON.stringify(receipt.verification ?? {performed:false}, null, 2))}</pre></div>
<div class="card"><h2>Log tail</h2><pre>${esc(receipt.process?.logTail ?? '')}</pre></div>
</main></body></html>`;
