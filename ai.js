/**
 * 对抗方 AI 引擎：11位风格迥异的Boss池（每局随机抽取3位连战）+ 高命中率智能出牌
 */

function makeSeats(enemyCount, lockedEnemyIndices = []) {
  const members = [
    { name: '元老张总', portrait: 'director-zhang' },
    { name: '中东基金', portrait: 'director-gulf-fund' },
    { name: '新加坡基金', portrait: 'director-singapore-fund' },
    { name: '首席科学家', portrait: 'director-scientist' },
    { name: '独立女董事', portrait: 'director-independent' },
    { name: '高盛秃鹫', portrait: 'director-goldman' },
    { name: '黑石秃鹫', portrait: 'director-blackstone' },
    { name: '政界独董', portrait: 'director-politics' },
    { name: '对手席位', isCore: true }
  ];
  return members.map(({ name, portrait, isCore = false }, idx) => {
    const isEnemy = idx >= members.length - enemyCount;
    return {
      id: `s${idx + 1}`,
      name,
      portrait,
      owner: isEnemy ? 'enemy' : 'neutral',
      locked: isCore || lockedEnemyIndices.includes(idx),
      isCore
    };
  });
}

const AI_BOSS_POOL = [
  {
    id: 'elena_pr',
    portrait: 'boss-elena',
    name: 'Elena Sterling',
    roleTitle: '公关秃鹫',
    passiveName: '舆论绞肉机',
    passiveDesc: '回合结束若你影响力 < 35，动摇 1 我方未锁定席位（否则扣 6🌟）。',
    tauntStart: '“热搜榜已经全是我买的通稿，你拿什么翻盘？”',
    onTurnEnd(state) {
      if (state.influence < 35) {
        const pSeat = state.seats.find(s => s.owner === 'player' && !s.locked);
        if (pSeat) {
          pSeat.owner = 'neutral';
          return { text: `舆论绞肉机：影响力不足 35，${pSeat.name} 动摇中立`, targetSeatId: pSeat.id };
        }
      }
      const loss = Math.min(state.influence, 6);
      state.influence -= loss;
      return { text: `舆论绞肉机：扣除 ${loss} 🌟影响力` };
    }
  },
  {
    id: 'cole_pol',
    portrait: 'boss-cole',
    name: 'Senator Cole',
    roleTitle: '铁腕政客',
    passiveName: '合规铁幕',
    passiveDesc: '【间谍/政治牌】加收 $200万。每回合锁定 1 个敌席，第 3 关首回合只预告。',
    tauntStart: '“这里归华盛顿管！每一张牌都要过我的合规审查。”',
    onTurnEnd(state) {
      if (state.stage === 3 && state.turn === 1) {
        return { text: '合规铁幕：下回合起锁定敌方席位' };
      }
      const unlockEnemy = state.seats.find(s => s.owner === 'enemy' && !s.locked && !s.isCore);
      if (unlockEnemy) {
        unlockEnemy.locked = true;
        return { text: `合规铁幕：锁定敌席 ${unlockEnemy.name}`, targetSeatId: unlockEnemy.id };
      }
      const loss = Math.min(state.cash, 400);
      state.cash -= loss;
      return { text: `合规铁幕：征收合规罚款 $${loss}万` };
    }
  },
  {
    id: 'marcus_ceo',
    portrait: 'boss-marcus',
    name: 'Marcus Vance',
    roleTitle: '篡位代理CEO',
    passiveName: '算力霸权',
    passiveDesc: '每回合结束抢占 1 个中立席位；无中立席且我方 ≥3 席时反抢 1 席，否则扣 10🌟。',
    tauntStart: '“公司现在姓 Vance，你只是个被除名的过客。”',
    onTurnEnd(state) {
      const pVotes = state.seats.filter(s => s.owner === 'player').length;
      const target = state.seats.find(s => s.owner === 'neutral') || (pVotes >= 3 ? state.seats.find(s => s.owner === 'player' && !s.locked) : null);
      if (target) {
        target.owner = 'enemy';
        return { text: `算力霸权：吞并了 ${target.name}`, targetSeatId: target.id };
      }
      const loss = Math.min(state.influence, 10);
      state.influence -= loss;
      return { text: `算力霸权：全网封锁，扣除 ${loss} 🌟影响力` };
    }
  },
  {
    id: 'victor_wolf',
    portrait: 'boss-victor',
    name: 'Victor Thorne',
    roleTitle: '华尔街做空之狼',
    passiveName: '恶意做空',
    passiveDesc: '每回合结束扣除你$500万；若你资金<$1500万，额外抢1中立席。',
    tauntStart: '“我已经做空了你的个人信用，看看你的现金还能撑几轮。”',
    onTurnEnd(state) {
      const loss = Math.min(state.cash, 500);
      state.cash -= loss;
      if (state.cash < 1500) {
        const n = state.seats.find(s => s.owner === 'neutral');
        if (n) {
          n.owner = 'enemy';
          return { text: `恶意做空：扣除 $${loss}万 并抢走 ${n.name}`, targetSeatId: n.id };
        }
      }
      return { text: `恶意做空：资金 -$${loss}万` };
    }
  },
  {
    id: 'dr_k',
    portrait: 'boss-dr-k',
    name: 'Dr. K',
    roleTitle: 'AI伦理委员会主委',
    passiveName: '安全红线',
    passiveDesc: '回合结束若你手牌 ≥4 张或 ≤1 张，扣 8🌟 影响力并锁定 1 个敌席。',
    tauntStart: '“为了全人类的安全，我们必须限制你这种狂人回归。”',
    onTurnEnd(state) {
      if (state.hand.length >= 4 || state.hand.length <= 1) {
        state.influence = Math.max(0, state.influence - 8);
        const e = state.seats.find(s => s.owner === 'enemy' && !s.locked && !s.isCore);
        if (e) {
          e.locked = true;
          return { text: `安全红线：触发审查，扣 8🌟 并锁定 ${e.name}`, targetSeatId: e.id };
        }
        return { text: '安全红线：触发安全审查，扣除 8 🌟影响力' };
      }
      return { text: '安全红线：手牌数量合规，本回合未触发审查' };
    }
  },
  {
    id: 'leo_spy',
    portrait: 'boss-leo',
    name: 'Leo',
    roleTitle: '桃色男间谍本尊',
    passiveName: '桃色幽灵',
    passiveDesc: '每回合结束60%概率动摇1我方未锁定席位，否则敲诈$400万封口费。',
    tauntStart: '“老板，这可是你自己约我聊架构的，别怪我不客气咯。”',
    onTurnEnd(state) {
      const pSeat = state.seats.find(s => s.owner === 'player' && !s.locked);
      if (pSeat && Math.random() < 0.6) {
        pSeat.owner = 'neutral';
        return { text: `桃色幽灵：爆料新照片，${pSeat.name} 动摇中立`, targetSeatId: pSeat.id };
      }
      const loss = Math.min(state.cash, 400);
      state.cash -= loss;
      return { text: `桃色幽灵：支付 $${loss}万 封口费` };
    }
  },
  {
    id: 'arthur_old',
    portrait: 'boss-arthur',
    name: 'Arthur Pendelton',
    roleTitle: '元老守旧派领袖',
    passiveName: '祖宗之法',
    passiveDesc: '敌方席位更难撼动：每回合结束若我方≥3席，强抢回1个未锁定席位。',
    tauntStart: '“公司不需要穿皮衣的摇滚明星，董事会的规矩不能破！”',
    onTurnEnd(state) {
      const pCount = state.seats.filter(s => s.owner === 'player').length;
      if (pCount >= 3) {
        const pSeat = state.seats.find(s => s.owner === 'player' && !s.locked);
        if (pSeat) {
          pSeat.owner = 'enemy';
          return { text: `祖宗之法：元老反扑，抢回 ${pSeat.name}`, targetSeatId: pSeat.id };
        }
      }
      const loss = Math.min(state.influence, 5);
      state.influence -= loss;
      return { text: `祖宗之法：元老发表公开信，影响力 -${loss}🌟` };
    }
  },
  {
    id: 'sophia_supply',
    portrait: 'boss-sophia',
    name: 'Sophia Chen',
    roleTitle: '晶圆供应链寡头',
    passiveName: '晶圆断供',
    passiveDesc: '你的【体力牌】额外消耗$200万；每回合结束抢占1个中立席位。',
    tauntStart: '“没有我的先进封装产能，你的新架构只是一堆PPT。”',
    onTurnEnd(state) {
      const n = state.seats.find(s => s.owner === 'neutral');
      if (n) {
        n.owner = 'enemy';
        return { text: `晶圆断供：以产能要挟，拉拢了 ${n.name}`, targetSeatId: n.id };
      }
      return { text: '晶圆断供：供应链全面收紧' };
    }
  },
  {
    id: 'miller_sec',
    portrait: 'boss-miller',
    name: 'Agent Miller',
    roleTitle: 'SEC 首席调查员',
    passiveName: '天眼审计',
    passiveDesc: '花钱的牌额外缴 $100万。回合结束扣 $300万，若扣款后资金 <$2,000万，则动摇 1 个未锁定的我方席位。',
    tauntStart: '“每笔公关费和餐费都在我的审计清单上，别想蒙混过关。”',
    onTurnEnd(state) {
      const loss = Math.min(state.cash, 300);
      state.cash -= loss;
      if (state.cash < 2000) {
        const pSeat = state.seats.find(s => s.owner === 'player' && !s.locked);
        if (pSeat) {
          pSeat.owner = 'neutral';
          return { text: `天眼审计：资金不足扣 $${loss}万 且 ${pSeat.name} 动摇`, targetSeatId: pSeat.id };
        }
      }
      return { text: `天眼审计：冻结并扣除 $${loss}万 调查保证金` };
    }
  },
  {
    id: 'baron_fund',
    portrait: 'boss-al-mansoor',
    name: 'Baron Al-Mansoor',
    roleTitle: '中东主权巨鳄',
    passiveName: '钞能力碾压',
    passiveDesc: '回合结束若你资金 <$4,500万，直接买下 1 个中立席位（否则扣 7🌟）。',
    tauntStart: '“在绝对的主权基金面前，你的3%股权不过是个零头。”',
    onTurnEnd(state) {
      if (state.cash < 4500) {
        const n = state.seats.find(s => s.owner === 'neutral');
        if (n) {
          n.owner = 'enemy';
          return { text: `钞能力碾压：砸钱买下 ${n.name}`, targetSeatId: n.id };
        }
      }
      const loss = Math.min(state.influence, 7);
      state.influence -= loss;
      return { text: `钞能力碾压：资本压制，影响力 -${loss}🌟` };
    }
  },
  {
    id: 'rex_rival',
    portrait: 'boss-rex',
    name: 'Rex Mercer',
    roleTitle: '敌对芯片巨头CEO',
    passiveName: '价格战倾销',
    passiveDesc: '每回合结束扣除你 8🌟 影响力；若影响力 < 25，额外抢占 1 个中立席位。',
    tauntStart: '“趁你内乱，我已经把性价比芯片铺满全球市场了！”',
    onTurnEnd(state) {
      state.influence = Math.max(0, state.influence - 8);
      if (state.influence < 25) {
        const n = state.seats.find(s => s.owner === 'neutral');
        if (n) {
          n.owner = 'enemy';
          return { text: `价格战倾销：扣 8🌟 并抢走 ${n.name}`, targetSeatId: n.id };
        }
      }
      return { text: '价格战倾销：影响力 -8🌟' };
    }
  }
];

function pickRunBosses(count = 3) {
  const pool = [...AI_BOSS_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

const AI_CARDS = [
  {
    id: 'ai_bribe',
    name: '华尔街分红收买',
    art: 'assets/card_ai_counter.svg',
    desc: '精准抢占 1 个中立或我方未锁定席位',
    taunt: '“董事们只认分红，这席归我了！”',
    canHit: s => s.seats.some(x => x.owner === 'neutral' || (x.owner === 'player' && !x.locked)),
    effects: { claimNeutralOrSteal: 1 }
  },
  {
    id: 'ai_scandal',
    name: '男间谍独家猛料',
    art: 'assets/card_ai_counter.svg',
    desc: '动摇 1 个我方未锁定席位，并扣 12 🌟影响力',
    taunt: '“桃色新闻持续发酵，你的影响力正在崩盘！”',
    canHit: s => s.seats.some(x => x.owner === 'player' && !x.locked) || s.influence >= 12,
    effects: { demotePlayer: 1, drainInf: 12 }
  },
  {
    id: 'ai_sec',
    name: 'SEC 账户冻结令',
    art: 'assets/card_ai_counter.svg',
    desc: '冻结并扣除玩家 $1,000万 资金',
    taunt: '“证监会已经盯上你的资金流了！”',
    canHit: s => s.cash >= 1000,
    effects: { drainCash: 1000 }
  },
  {
    id: 'ai_poach',
    name: '截胡供应链订单',
    art: 'assets/card_ai_counter.svg',
    desc: '拉拢 1 个中立席位倒向敌方',
    taunt: '“签字权在我手里，中立董事已经站队！”',
    canHit: s => s.seats.some(x => x.owner === 'neutral'),
    effects: { claimNeutral: 1 }
  },
  {
    id: 'ai_fake_photo',
    name: 'AI合成皮衣假照',
    art: 'assets/card_ai_counter.svg',
    desc: '全网群嘲，扣除玩家 15 🌟影响力',
    taunt: '“极客们都在转发你穿铆钉皮衣的假照！”',
    canHit: s => s.influence >= 10,
    effects: { drainInf: 15 }
  },
  {
    id: 'ai_forced_brisket',
    name: '散布强迫员工吃牛腩新闻',
    category: 'rumor',
    art: 'assets/card_ai_counter.svg',
    desc: '散播员工被强迫吃牛腩的风闻，扣除玩家 20 🌟影响力',
    taunt: '“牛腩菜单已经上了热搜，你准备怎么回应？”',
    canHit: s => s.influence >= 20,
    effects: { drainInf: 20 }
  },
  {
    id: 'ai_budget_rumor',
    name: '散布预算失控风闻',
    category: 'rumor',
    art: 'assets/card_ai_counter.svg',
    desc: '扣除玩家 $600万 资金与 6 🌟影响力',
    taunt: '“预算表传开了，股东等着你解释。”',
    canHit: s => s.cash >= 600 && s.influence >= 6,
    effects: { drainCash: 600, drainInf: 6 }
  },
  {
    id: 'ai_supplier_rumor',
    name: '散布供应商撤单风闻',
    category: 'rumor',
    art: 'assets/card_ai_counter.svg',
    desc: '拉拢 1 个中立席位倒向敌方，并扣除玩家 $300万 资金',
    taunt: '“撤单传闻已经传进董事会，有人坐不住了。”',
    canHit: s => s.cash >= 300 && s.seats.some(x => x.owner === 'neutral'),
    effects: { claimNeutral: 1, drainCash: 300 }
  }
];

function executeEnemyEffects(card, state) {
  const fx = card.effects || {};
  let targetSeatId = null;
  let floatParts = [];

  if (fx.claimNeutral) {
    const neutral = state.seats.find(s => s.owner === 'neutral');
    if (neutral) {
      neutral.owner = 'enemy';
      targetSeatId = neutral.id;
      floatParts.push('敌方+1席');
    }
  }

  if (fx.claimNeutralOrSteal) {
    const pSeats = state.seats.filter(s => s.owner === 'player' && !s.locked);
    const neutrals = state.seats.filter(s => s.owner === 'neutral');
    const pool = pSeats.length > 0 && Math.random() < 0.55 ? pSeats : (neutrals.length > 0 ? neutrals : pSeats);
    if (pool.length > 0) {
      const t = pool[Math.floor(Math.random() * pool.length)];
      t.owner = 'enemy';
      targetSeatId = t.id;
      floatParts.push('敌方夺1席!');
    }
  }

  if (fx.demotePlayer) {
    const pSeats = state.seats.filter(s => s.owner === 'player' && !s.locked);
    if (pSeats.length > 0) {
      const t = pSeats[Math.floor(Math.random() * pSeats.length)];
      t.owner = 'neutral';
      targetSeatId = t.id;
      floatParts.push('席位动摇!');
    }
  }

  if (fx.drainInf) {
    const loss = Math.min(state.influence, fx.drainInf);
    state.influence -= loss;
    if (loss > 0) floatParts.push(`-${loss}🌟`);
  }

  if (fx.drainCash) {
    const loss = Math.min(state.cash, fx.drainCash);
    state.cash -= loss;
    if (loss > 0) floatParts.push(`-$${loss}万`);
  }

  return {
    targetSeatId,
    floatText: floatParts.join(' · ') || '稳固防线'
  };
}

function getAiConfig() {
  try {
    const raw = localStorage.getItem('backtoceo_ai_config');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { engine: 'builtin', personality: 'balanced', url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini', key: '' };
}

function saveAiConfig(cfg) {
  localStorage.setItem('backtoceo_ai_config', JSON.stringify(cfg));
}

function getAiCardPool(state, excludedCardIds = new Set()) {
  const available = AI_CARDS.filter(card => !excludedCardIds.has(card.id));
  const valid = available.filter(card => card.canHit(state));
  return valid.length > 0 ? valid : available;
}

function runBuiltinAi(state, personality = 'balanced', excludedCardIds) {
  const pool = getAiCardPool(state, excludedCardIds);
  const pCount = state.seats.filter(s => s.owner === 'player' && !s.locked).length;
  const find = id => pool.find(c => c.id === id);
  let chosen = null;

  if (personality === 'scandal') {
    if (pCount >= 1 && find('ai_scandal') && Math.random() < 0.75) chosen = find('ai_scandal');
    else if (find('ai_forced_brisket') && Math.random() < 0.5) chosen = find('ai_forced_brisket');
    else if (find('ai_fake_photo') && Math.random() < 0.65) chosen = find('ai_fake_photo');
  } else if (personality === 'coverup') {
    if (state.cash >= 1000 && find('ai_sec') && Math.random() < 0.75) chosen = find('ai_sec');
    else if (find('ai_bribe') && Math.random() < 0.6) chosen = find('ai_bribe');
  } else {
    if (pCount >= 2 && find('ai_scandal') && Math.random() < 0.65) chosen = find('ai_scandal');
    else if (find('ai_bribe') && Math.random() < 0.6) chosen = find('ai_bribe');
    else if (state.cash >= 2200 && find('ai_sec')) chosen = find('ai_sec');
  }

  if (!chosen) chosen = pool[Math.floor(Math.random() * pool.length)];
  return { card: chosen, taunt: chosen.taunt, source: 'builtin' };
}

async function runLlmAi(state, cfg, excludedCardIds, boss = null) {
  if (!cfg.key || !cfg.url) return runBuiltinAi(state, cfg.personality || 'balanced', excludedCardIds);

  const pool = getAiCardPool(state, excludedCardIds);
  const menu = pool.map(c => `- ${c.id}: ${c.name} (${c.desc})`).join('\n');

  const pCount = state.seats.filter(s => s.owner === 'player').length;
  const eCount = state.seats.filter(s => s.owner === 'enemy').length;

  const prompt = `你是商战卡牌游戏第${state.stage}/3关的对手“${boss?.name || 'Marcus'}”（${boss?.roleTitle || ''}）。
当前第 ${state.turn}/${state.maxTurns} 回合，Gesen 占 ${pCount} 席，你占 ${eCount} 席，Gesen 资金 $${state.cash}万，影响力 ${state.influence}。
请从以下高命中反制牌选 1 张打出，并给一句符合身份的嘲讽（不超过25字）：
${menu}
严格返回JSON：{"card_id":"id","taunt":"台词"}`;

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
    return runBuiltinAi(state, cfg.personality || 'balanced', excludedCardIds);
  }
}
