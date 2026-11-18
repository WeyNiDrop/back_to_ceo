const expectedDigest = Uint8Array.from("92a10e2119a4c3b803a58bb581f2cc23de47c9c8757f99c7113290f8b0dd6ee8".match(/../g), hex => Number.parseInt(hex, 16));
const expiresAt = 1795019720391;

const playerId = 'example-evan-musk';
const runId = 'example-evan-musk-board-v1';
const nickname = 'Evan Musk';
const rules = 'board-v1';
const elapsed = 351000;

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  if (url.hostname !== 'btceo.create-ai.cc' || request.method !== 'POST' || Date.now() >= expiresAt) {
    return new Response(null, { status: 404 });
  }
  const header = request.headers.get('Authorization') ?? '';
  if (!/^Bearer [0-9a-f]{64}$/.test(header)) return new Response(null, { status: 404 });
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(header.slice(7))));
  if (!crypto.subtle.timingSafeEqual(digest, expectedDigest)) return new Response(null, { status: 404 });
  if (!env.DB) return Response.json({ error: 'D1_BINDING_MISSING' }, { status: 503 });

  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO players (player_id, nickname, created_at_ms) VALUES (?, ?, ?)').bind(playerId, nickname, now),
    env.DB.prepare(
      'INSERT OR IGNORE INTO runs (run_id, player_id, rules_version, started_at_ms, finished_at_ms, elapsed_ms) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(runId, playerId, rules, now - elapsed, now, elapsed),
    env.DB.prepare(
      'INSERT OR IGNORE INTO best_times (player_id, rules_version, run_id, elapsed_ms, finished_at_ms)'
      + ' SELECT player_id, rules_version, run_id, elapsed_ms, finished_at_ms FROM runs WHERE run_id = ?'
    ).bind(runId),
  ]);
  return Response.json({ nickname, elapsedMs: elapsed }, { headers: { 'Cache-Control': 'no-store' } });
}
