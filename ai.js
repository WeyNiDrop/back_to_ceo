// Browser settings and optional language-model opponents.

function getAiConfig() {
  try {
    const raw = localStorage.getItem('backtoceo_ai_config');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { engine: 'builtin', url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini', key: '' };
}

function saveAiConfig(cfg) {
  localStorage.setItem('backtoceo_ai_config', JSON.stringify(cfg));
}

async function runLlmAi(state, cfg, excludedCardIds, boss, { getAiCardPool, runBuiltinAi }) {
  if (!cfg.key || !cfg.url) return runBuiltinAi(state, excludedCardIds);

  const pool = getAiCardPool(state, excludedCardIds);
  const menu = pool.map(c => `- ${c.id}: ${translate(c.name)} (${translate(c.desc)})`).join('\n');

  const pCount = state.seats.filter(s => s.owner === 'player').length;
  const eCount = state.seats.filter(s => s.owner === 'enemy').length;

  const prompt = translate(
    `你是商战卡牌游戏第 {0}/3 关的对手“{1}”（{2}）。
当前第 {3}/{4} 回合，Gesen 占 {5} 席，你占 {6} 席，Gesen 资金 {7}，影响力 {8}。
请从以下反制牌选 1 张打出，并给一句符合身份的简体中文嘲讽（不超过 25 字）：
{9}
严格返回 JSON：{"card_id":"id","taunt":"台词"}`,
    state.stage, boss?.name || 'Marcus', translate(boss?.roleTitle || ''), state.turn, state.maxTurns,
    pCount, eCount, formatCash(state.cash), state.influence, menu
  );

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(cfg.url.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.key.trim()}` },
      body: JSON.stringify({
        model: cfg.model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 120
      }),
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('No JSON');
    const parsed = JSON.parse(m[0]);
    const card = pool.find(c => c.id === parsed.card_id) || pool[0];
    return { card, taunt: parsed.taunt || card.taunt, source: 'llm' };
  } catch (err) {
    return runBuiltinAi(state, excludedCardIds);
  }
}
