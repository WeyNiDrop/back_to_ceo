import { normalizePlayerName, replayRankedRun } from '../../game-rules.mjs';

const RULES_VERSION = 'board-v1';
const MAX_RUN_MS = 2 * 60 * 60 * 1000;
const COOKIE_NAME = '__Host-btceo-player';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const text = new TextEncoder();

function json(body, status = 200, headers = {}) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

function playerCookie(request) {
  const cookies = request.headers.get('Cookie')?.split(';') ?? [];
  const value = cookies.find(cookie => cookie.trim().startsWith(COOKIE_NAME + '='))?.trim().slice(COOKIE_NAME.length + 1);
  return UUID.test(value ?? '') ? value : null;
}

function playerHeader(player) {
  return COOKIE_NAME + '=' + player + '; Path=/; Max-Age=31536000; Secure; HttpOnly; SameSite=Strict';
}

function encode(bytes) {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function decode(value) {
  return Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), char => char.charCodeAt(0));
}

function signingKey(secret) {
  return crypto.subtle.importKey('raw', text.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function sign(data, secret) {
  const payload = encode(text.encode(JSON.stringify(data)));
  const signature = await crypto.subtle.sign('HMAC', await signingKey(secret), text.encode(payload));
  return payload + '.' + encode(new Uint8Array(signature));
}

async function verify(token, secret, player, now) {
  if (typeof token !== 'string' || token.length > 768 || !/^[\w-]+\.[\w-]+$/.test(token)) return null;
  const [payload, signature] = token.split('.');
  try {
    if (!await crypto.subtle.verify('HMAC', await signingKey(secret), decode(signature), text.encode(payload))) return null;
    const run = JSON.parse(new TextDecoder().decode(decode(payload)));
    const elapsed = now - run.started;
    return run.player === player && run.rules === RULES_VERSION && elapsed > 0 && elapsed <= MAX_RUN_MS ? run : null;
  } catch {
    return null;
  }
}

async function readAction(request) {
  const maxBytes = 8192;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let size = 0;
  let value = '';
  while (true) {
    const { done, value: chunk } = await reader.read();
    if (done) break;
    size += chunk.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return null;
    }
    value += decoder.decode(chunk, { stream: true });
  }
  try {
    return JSON.parse(value + decoder.decode());
  } catch {
    return null;
  }
}

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ error: 'LEADERBOARD_UNAVAILABLE' }, 503);
  try {
    const [top, count] = await env.DB.batch([
      env.DB.prepare(
        'SELECT p.nickname, b.elapsed_ms AS elapsedMs'
        + ' FROM best_times b JOIN players p ON p.player_id = b.player_id'
        + ' WHERE b.rules_version = ? ORDER BY b.elapsed_ms, b.finished_at_ms, b.player_id LIMIT 20'
      ).bind(RULES_VERSION),
      env.DB.prepare('SELECT COUNT(*) AS cleared FROM players'),
    ]);
    return json({
      entries: top.results,
      cleared: count.results[0].cleared,
      rankedAvailable: Boolean(env.RUN_SIGNING_KEY),
    });
  } catch (error) {
    console.error('Leaderboard query failed', error);
    return json({ error: 'LEADERBOARD_UNAVAILABLE' }, 503);
  }
}

async function saveRun(db, run, nickname, now) {
  const results = await db.batch([
    db.prepare(
      'INSERT INTO players (player_id, nickname, created_at_ms)'
      + ' SELECT ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM runs WHERE run_id = ?)'
      + ' ON CONFLICT (player_id) DO UPDATE SET nickname = excluded.nickname'
    ).bind(run.player, nickname, now, run.id),
    db.prepare(
      'INSERT INTO runs (run_id, player_id, rules_version, started_at_ms, finished_at_ms, elapsed_ms)'
      + ' VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (run_id) DO NOTHING'
    ).bind(run.id, run.player, RULES_VERSION, run.started, now, now - run.started),
    db.prepare(
      'INSERT INTO best_times (player_id, rules_version, run_id, elapsed_ms, finished_at_ms)'
      + ' SELECT player_id, rules_version, run_id, elapsed_ms, finished_at_ms FROM runs WHERE run_id = ?'
      + ' ON CONFLICT (rules_version, player_id) DO UPDATE SET'
      + ' run_id = excluded.run_id, elapsed_ms = excluded.elapsed_ms, finished_at_ms = excluded.finished_at_ms'
      + ' WHERE excluded.elapsed_ms < best_times.elapsed_ms'
      + ' OR (excluded.elapsed_ms = best_times.elapsed_ms AND excluded.finished_at_ms < best_times.finished_at_ms)'
    ).bind(run.id),
    db.prepare(
      'SELECT r.elapsed_ms AS elapsedMs, b.elapsed_ms AS bestElapsedMs'
      + ' FROM runs r JOIN best_times b ON b.player_id = r.player_id AND b.rules_version = r.rules_version'
      + ' WHERE r.run_id = ?'
    ).bind(run.id),
  ]);
  return results.at(-1).results[0];
}

export async function onRequestPost({ request, env }) {
  const now = Date.now();
  if (new URL(request.url).origin !== request.headers.get('Origin')) return json({ error: 'INVALID_ORIGIN' }, 403);
  if (!env.DB || !env.RUN_SIGNING_KEY) return json({ error: 'LEADERBOARD_UNAVAILABLE' }, 503);
  try {
    const action = await readAction(request);
    const player = playerCookie(request);
    if (action?.type === 'start') {
      const id = player ?? crypto.randomUUID();
      const seed = crypto.getRandomValues(new Uint32Array(1))[0];
      const run = { id: crypto.randomUUID(), player: id, seed, rules: RULES_VERSION, started: now };
      return json({ token: await sign(run, env.RUN_SIGNING_KEY), seed }, 200, { 'Set-Cookie': playerHeader(id) });
    }
    if (action?.type !== 'finish') return json({ error: 'INVALID_ACTION' }, 400);
    const run = player && await verify(action.token, env.RUN_SIGNING_KEY, player, now);
    if (!run) return json({ error: 'INVALID_RUN' }, 400);
    const nickname = typeof action.nickname === 'string' && normalizePlayerName(action.nickname);
    const replay = nickname && replayRankedRun(run.seed, action.actions);
    if (!replay || now - run.started + 1000 < replay.animationMs) return json({ error: 'INVALID_RUN' }, 400);
    return json(await saveRun(env.DB, run, nickname, now));
  } catch (error) {
    console.error('Leaderboard submission failed', error);
    return json({ error: 'LEADERBOARD_UNAVAILABLE' }, 503);
  }
}
