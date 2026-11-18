const previewHost = 'codex-d1-smoke-test.back-to-ceo.pages.dev';
const expiresAt = Date.parse('2026-11-19T14:46:39.069Z');
const expectedDigest = Uint8Array.from('f9cf3b3787dfd144a7bd77ee8402884746797ebb4b58a9bb2dc4fee730e73faa'.match(/../g), hex => Number.parseInt(hex, 16));
const checkedTables = ['players', 'runs', 'best_times'];
const headers = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff'
};

const page = [
  '<!doctype html><html lang="zh-CN"><meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<title>Back To CEO · D1 读写测试</title>',
  '<style>',
  '*{box-sizing:border-box}body{margin:0;background:#10231d;color:#f5efe1;font:16px/1.65 system-ui,sans-serif;padding:clamp(20px,8vw,80px)}',
  'main{max-width:40rem;margin:auto;background:#173027;border:1px solid #4e675a;border-radius:12px;padding:clamp(18px,5vw,40px)}',
  'h1{margin-top:0;line-height:1.2}label{display:block;margin-bottom:6px}input,button{font:inherit;border-radius:6px;padding:9px 12px}',
  'input{width:100%;border:1px solid #789082;background:#10231d;color:inherit}.actions{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}',
  'button{border:1px solid #bea66e;background:#e8cc92;color:#14241c;cursor:pointer}button:disabled{opacity:.6}',
  'pre{min-height:3em;white-space:pre-wrap;overflow-wrap:anywhere;background:#0c1b16;border-radius:6px;padding:12px}',
  '</style>',
  '<main><h1>D1 读写测试</h1><p>读取三张排行榜表，或用临时记录验证写入、读回和清理。</p>',
  '<form id="probe"><label for="code">测试码</label>',
  '<input id="code" type="password" required autocomplete="off" autocapitalize="off" pattern="[a-f0-9]{32}" maxlength="32">',
  '<div class="actions"><button type="submit" value="schema">读取表结构</button><button type="submit" value="roundtrip">验证写入与清理</button></div>',
  '</form><pre id="out" role="status">等待测试</pre></main>',
  '<script>',
  'const form=document.getElementById("probe");',
  'const out=document.getElementById("out");',
  'form.addEventListener("submit",async(event)=>{',
  'event.preventDefault();',
  'const check=event.submitter?.value??"schema";',
  'const buttons=form.querySelectorAll("button");',
  'buttons.forEach(button=>{button.disabled=true;});',
  'out.textContent="正在测试…";',
  'try{',
  'const response=await fetch(location.pathname+"?check="+check,{method:"POST",headers:{Authorization:"Bearer "+document.getElementById("code").value}});',
  'const data=await response.json();',
  'out.textContent=JSON.stringify(data,null,2);',
  '}catch{out.textContent="无法获取测试结果，请稍后重试。";}',
  'finally{buttons.forEach(button=>{button.disabled=false;});}',
  '});',
  '</script></html>'
].join('\n');

function json(data, status = 200) {
  return Response.json(data, { status, headers });
}

async function isAuthorized(request) {
  const match = request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{32})$/);
  if (!match) return false;
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(match[1])));
  let difference = 0;
  for (let i = 0; i < expectedDigest.length; i++) difference |= digest[i] ^ expectedDigest[i];
  return difference === 0;
}

async function readSchema(db) {
  const { results } = await db.prepare(
    "SELECT name, type FROM sqlite_schema WHERE name IN ('players', 'runs', 'best_times', 'best_times_rank_idx')"
  ).all();
  const tables = checkedTables.filter(name => results.some(row => row.name === name && row.type === 'table'));
  const index = results.some(row => row.name === 'best_times_rank_idx' && row.type === 'index');
  const ok = tables.length === checkedTables.length && index;
  return json({ ok, tables, index }, ok ? 200 : 503);
}

async function verifyRoundTrip(db) {
  const playerId = 'd1-probe-' + crypto.randomUUID();
  const runId = 'd1-probe-' + crypto.randomUUID();
  const nickname = 'D1 probe';
  const startedAt = Date.now() - 1000;
  const finishedAt = startedAt + 1000;
  const rulesVersion = 'd1-probe';

  const [player, run, best, read, removedBest, removedRun, removedPlayer, residue] = await db.batch([
    db.prepare('INSERT INTO players (player_id, nickname, created_at_ms) VALUES (?, ?, ?)')
      .bind(playerId, nickname, startedAt),
    db.prepare('INSERT INTO runs (run_id, player_id, rules_version, started_at_ms, finished_at_ms, elapsed_ms) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(runId, playerId, rulesVersion, startedAt, finishedAt, 1000),
    db.prepare('INSERT INTO best_times (player_id, rules_version, run_id, elapsed_ms, finished_at_ms) VALUES (?, ?, ?, ?, ?)')
      .bind(playerId, rulesVersion, runId, 1000, finishedAt),
    db.prepare('SELECT p.nickname, r.elapsed_ms FROM players p JOIN runs r ON r.player_id = p.player_id JOIN best_times b ON b.run_id = r.run_id WHERE p.player_id = ? AND r.run_id = ?')
      .bind(playerId, runId),
    db.prepare('DELETE FROM best_times WHERE player_id = ? AND run_id = ?').bind(playerId, runId),
    db.prepare('DELETE FROM runs WHERE run_id = ? AND player_id = ?').bind(runId, playerId),
    db.prepare('DELETE FROM players WHERE player_id = ?').bind(playerId),
    db.prepare('SELECT EXISTS (SELECT 1 FROM players WHERE player_id = ?) AS player, EXISTS (SELECT 1 FROM runs WHERE run_id = ?) AS run, EXISTS (SELECT 1 FROM best_times WHERE player_id = ? AND run_id = ?) AS best')
      .bind(playerId, runId, playerId, runId)
  ]);
  const row = read.results[0];
  const remaining = residue.results[0];
  const write = [player, run, best].every(result => result.meta.changes === 1);
  const readBack = row?.nickname === nickname && row.elapsed_ms === 1000;
  const cleanup = [removedBest, removedRun, removedPlayer].every(result => result.meta.changes === 1)
    && remaining?.player === 0 && remaining.run === 0 && remaining.best === 0;
  const ok = write && readBack && cleanup;
  return json({ ok, write, readBack, cleanup }, ok ? 200 : 503);
}

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  if (url.hostname !== previewHost) return json({ ok: false, error: 'NOT_FOUND' }, 404);
  if (Date.now() >= expiresAt) return json({ ok: false, error: 'TEST_EXPIRED' }, 410);
  if (request.method === 'GET') return new Response(page, { headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' } });
  if (request.method !== 'POST') return json({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
  if (!await isAuthorized(request)) return json({ ok: false, error: 'INVALID_TEST_CODE' }, 401);
  if (!env.DB) return json({ ok: false, error: 'PREVIEW_DB_BINDING_MISSING' }, 503);

  try {
    const check = url.searchParams.get('check');
    if (check === 'schema') return await readSchema(env.DB);
    if (check === 'roundtrip') return await verifyRoundTrip(env.DB);
    return json({ ok: false, error: 'UNKNOWN_CHECK' }, 400);
  } catch (error) {
    console.error('D1 probe failed', error);
    return json({ ok: false, error: 'D1_CHECK_FAILED' }, 503);
  }
}
