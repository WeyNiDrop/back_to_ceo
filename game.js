/**
 * Back To CEO 重回巅峰之路
 */

const TURN_LABELS = [
  'DAY 1 白天', 'DAY 1 夜晚',
  'DAY 2 白天', 'DAY 2 夜晚',
  'DAY 3 白天', 'DAY 3 夜晚'
];

const RARITY_LABELS = { common: '普通', rare: '精良', legendary: '传说' };
const CATEGORY_META = {
  stamina: { label: '🍗 体力牌', color: '#f59e0b' },
  influence: { label: '📢 影响力牌', color: '#a855f7' },
  spy: { label: '🕵️ 间谍牌', color: '#38bdf8' },
  politics: { label: '🏛️ 政治牌', color: '#22c55e' }
};

const STANCES = {
  geek: {
    id: 'geek',
    name: '⚡ 极客技术派',
    desc: '抽到的手牌有概率附带【算力减费】【极客狂热】【架构共振】等词条。',
    affixes: [
      { name: '算力减费', desc: '本牌体力-1💎', mod: { apDiscount: 1 } },
      { name: '极客狂热', desc: '额外+6🌟', mod: { bonusInf: 6 } },
      { name: '架构共振', desc: '额外摸1牌', mod: { bonusDraw: 1 } }
    ]
  },
  capital: {
    id: 'capital',
    name: '💰 华尔街资本派',
    desc: '抽到的手牌有概率附带【现金回流】【溢价护盘】【做空狙击】等词条。',
    affixes: [
      { name: '现金回流', desc: '额外+$400万', mod: { bonusCash: 400 } },
      { name: '溢价护盘', desc: '额外+8🌟', mod: { bonusInf: 8 } },
      { name: '做空狙击', desc: '动摇1敌席', mod: { bonusDemote: 1 } }
    ]
  },
  iron: {
    id: 'iron',
    name: '🕶️ 暗战铁腕派',
    desc: '抽到的手牌有概率附带【顺手加锁】【威慑压制】【回魂咖啡】等词条。',
    affixes: [
      { name: '顺手加锁', desc: '抢席后锁定🔒', mod: { bonusLock: true } },
      { name: '威慑压制', desc: '敌方减牌1张（至少2张）', mod: { bonusWeaken: 1 } },
      { name: '回魂咖啡', desc: '额外+1💎', mod: { bonusAp: 1 } }
    ]
  }
};

// 从真实新闻提炼的6个负面新闻词条
const NEGATIVE_AFFIXES = [
  { name: '间谍门泄密', desc: '打出后 -8🌟', isNeg: true, mod: { infPenalty: 8 } },
  { name: '酒店录像曝光', desc: '体力消耗 +1💎', isNeg: true, mod: { apPenalty: 1 } },
  { name: '50/50分产危机', desc: '额外 -$500万', isNeg: true, mod: { cashPenalty: 500 } },
  { name: '国会闭门听证', desc: '需影响力 ≥20🌟', isNeg: true, mod: { infReqPenalty: 20 } },
  { name: 'DOJ三线调查', desc: '律师费 +$400万', isNeg: true, mod: { cashPenalty: 400 } },
  { name: '60人直管过劳', desc: '打出后 -5🌟', isNeg: true, mod: { infPenalty: 5 } },
  { name: '与女下属有染', desc: '体力 +1💎 且打出后 -6🌟', isNeg: true, mod: { apPenalty: 1, infPenalty: 6 } },
  { name: '诅咒董事去死', desc: '需 ≥25🌟 且额外 -$400万', isNeg: true, mod: { infReqPenalty: 25, cashPenalty: 400 } }
];

// 19张统一4大类卡牌库（支持 apCost / cashCost / infCost 消耗）
const CARD_DB = {
  chimaek: { id: 'chimaek', title: '炸鸡啤酒套餐', category: 'stamina', rarity: 'common', art: 'assets/card_supply.svg', apCost: 0, cashCost: 100, infCost: 0, effects: { gainAp: 2 } },
  coffee: { id: 'coffee', title: 'Denny\'s 苦咖啡', category: 'stamina', rarity: 'common', art: 'assets/card_supply.svg', apCost: 0, cashCost: 0, infCost: 0, effects: { gainAp: 1, draw: 1 } },
  nightmarket: { id: 'nightmarket', title: '夜市微服私访', category: 'stamina', rarity: 'common', art: 'assets/card_supply.svg', apCost: 1, cashCost: 100, infCost: 0, effects: { gainAp: 1, gainCash: 500, gainInf: 5 } },
  banquet: { id: 'banquet', title: '古早味·兆元宴', category: 'stamina', rarity: 'rare', art: 'assets/card_banquet.svg', apCost: 2, cashCost: 300, infCost: 0, effects: { gainCash: 1400, gainInf: 10 } },

  pr_troll: { id: 'pr_troll', title: '硅谷水军控评', category: 'influence', rarity: 'common', art: 'assets/card_pr.svg', apCost: 1, cashCost: 400, infCost: 0, effects: { gainInf: 12, claimNeutral: 1 } },
  inf_livestream: { id: 'inf_livestream', title: '深夜代码直播', category: 'influence', rarity: 'common', art: 'assets/card_pr.svg', apCost: 1, cashCost: 200, infCost: 0, effects: { gainInf: 15, draw: 1 } },
  pr_interview: { id: 'pr_interview', title: '皮衣播客专访', category: 'influence', rarity: 'rare', art: 'assets/card_pr.svg', apCost: 2, cashCost: 0, infCost: 0, effects: { gainInf: 15, claimNeutral: 1, draw: 1 } },
  pr_debunk: { id: 'pr_debunk', title: '假照辟谣反转', category: 'influence', rarity: 'rare', art: 'assets/card_pr.svg', apCost: 1, cashCost: 0, infCost: 12, effects: { claimNeutralOrSteal: 1, draw: 1 } },
  pr_keynote: { id: 'pr_keynote', title: '算力核弹发布会', category: 'influence', rarity: 'legendary', art: 'assets/card_banquet.svg', apCost: 2, cashCost: 800, infCost: 20, effects: { stealOrClaim: 2, lockClaimed: true } },

  spy_tail: { id: 'spy_tail', title: '私家侦探盯梢', category: 'spy', rarity: 'common', art: 'assets/card_intel.svg', apCost: 1, cashCost: 400, infCost: 0, effects: { draw: 2, weakenAi: 1 } },
  spy_precision_cut: { id: 'spy_precision_cut', title: '精准一刀', category: 'spy', rarity: 'rare', art: 'assets/card_precision_cut.svg', apCost: 1, cashCost: 0, infCost: 20, effects: { gainCash: 1000 } },
  spy_wiretap: { id: 'spy_wiretap', title: '会议室窃听器', category: 'spy', rarity: 'rare', art: 'assets/card_intel.svg', apCost: 1, cashCost: 600, infCost: 0, effects: { gainInf: 10, stealEnemy: 1 } },
  spy_cctv: { id: 'spy_cctv', title: '酒店监控实锤', category: 'spy', rarity: 'rare', art: 'assets/card_intel.svg', apCost: 2, cashCost: 800, infCost: 0, effects: { stealEnemy: 1, gainInf: 10 } },
  spy_honeypot: { id: 'spy_honeypot', title: '反间谍舆论战', category: 'spy', rarity: 'rare', art: 'assets/card_intel.svg', apCost: 2, cashCost: 700, infCost: 0, effects: { claimNeutral: 1, demoteEnemy: 1 } },
  spy_turncoat: { id: 'spy_turncoat', title: '策反男间谍', category: 'spy', rarity: 'legendary', art: 'assets/card_intel.svg', apCost: 2, cashCost: 1000, infCost: 15, effects: { stealEnemy: 2 } },

  pol_notice: { id: 'pol_notice', title: '律师函禁制令', category: 'politics', rarity: 'common', art: 'assets/card_legal.svg', apCost: 1, cashCost: 600, infCost: 0, effects: { claimNeutral: 1, lockClaimed: true } },
  pol_filibuster: { id: 'pol_filibuster', title: '程序拖延战术', category: 'politics', rarity: 'rare', art: 'assets/card_legal.svg', apCost: 1, cashCost: 500, infCost: 0, effects: { claimNeutralOrSteal: 1, weakenAi: 1 } },
  pol_lobby: { id: 'pol_lobby', title: '国会山政客游说', category: 'politics', rarity: 'rare', art: 'assets/card_legal.svg', apCost: 2, cashCost: 1200, infCost: 0, effects: { stealEnemy: 1, lockClaimed: true } },
  pol_revolt: { id: 'pol_revolt', title: '700人联名逼宫', category: 'politics', rarity: 'legendary', art: 'assets/card_legal.svg', apCost: 2, cashCost: 0, infCost: 25, effects: { stealOrClaim: 2, freezeAi: true } }
};

const DECK_RECIPE = [
  'chimaek', 'chimaek', 'coffee', 'coffee', 'nightmarket', 'banquet',
  'pr_troll', 'inf_livestream', 'pr_interview', 'pr_debunk', 'pr_keynote',
  'spy_tail', 'spy_precision_cut', 'spy_wiretap', 'spy_cctv', 'spy_honeypot', 'spy_turncoat',
  'pol_notice', 'pol_filibuster', 'pol_lobby', 'pol_revolt'
];

const MIN_ENEMY_CARDS = 2;
const INSTANT_WIN_SEATS = [6, 7, 7];
const BOARD_MAJORITY = 5;

let state = {};
let isAnimating = false;
let isEnemyTurn = false;
let isDiscardMode = false;

function getCurrentBoss() {
  return (state.runBosses && state.runBosses[state.stage - 1]) || AI_BOSS_POOL[0];
}

function getEnemyCardCount(turnState) {
  if (turnState.aiFrozen) return MIN_ENEMY_CARDS;
  return Math.max(MIN_ENEMY_CARDS, turnState.cardsPlayedThisTurn - turnState.aiPenalty);
}

function getStageGoalText() {
  const instantSeats = INSTANT_WIN_SEATS[state.stage - 1];
  return `占 ${instantSeats} 席或锁 ${BOARD_MAJORITY} 席即胜（第 ${state.maxTurns} 回合末 ≥${BOARD_MAJORITY} 席晋级）`;
}

function portraitSrc(portrait) {
  return `assets/portraits/${portrait}.jpg`;
}

function getEffectiveCosts(item) {
  const c = CARD_DB[item.key];
  const boss = getCurrentBoss();
  let ap = Math.max(0, c.apCost - (item.affix?.mod?.apDiscount || 0) + (item.affix?.mod?.apPenalty || 0));
  let cash = c.cashCost + (item.affix?.mod?.cashPenalty || 0);
  let inf = c.infCost || 0;
  let infReq = item.affix?.mod?.infReqPenalty || 0;
  if (boss.id === 'cole_pol' && (c.category === 'spy' || c.category === 'politics')) cash += 200;
  if (boss.id === 'sophia_supply' && c.category === 'stamina') cash += 200;
  if (boss.id === 'miller_sec' && cash > 0) cash += 100;
  return { ap, cash, inf, infReq };
}

function getUnplayableReason(costs) {
  if (state.gameOver) return '本局已结束';
  if (isAnimating) return isEnemyTurn ? '对手回合演出中' : '出牌动画播放中';
  const reasons = [];
  if (state.ap < costs.ap) reasons.push(`缺体力(需${costs.ap}💎)`);
  if (state.cash < costs.cash) reasons.push(`缺资金(需$${costs.cash}万)`);
  const needInf = Math.max(costs.inf, costs.infReq || 0);
  if (state.influence < needInf) reasons.push(`缺影响力(需${needInf}🌟)`);
  return reasons.join(' · ');
}

function formatCardDesc(card, item) {
  const fx = card.effects || {};
  const parts = [];
  if (fx.gainAp) parts.push(`+${fx.gainAp}💎`);
  if (fx.gainCash) parts.push(`+$${fx.gainCash}万`);
  if (fx.gainInf) parts.push(`+${fx.gainInf}🌟`);
  if (fx.draw) parts.push(`摸${fx.draw}牌`);
  if (fx.claimNeutral) parts.push(`抢${fx.claimNeutral}中立席`);
  if (fx.claimNeutralOrSteal) parts.push(`抢${fx.claimNeutralOrSteal}任意席`);
  if (fx.stealEnemy) parts.push(`强抢${fx.stealEnemy}敌席`);
  if (fx.stealOrClaim) parts.push(`夺取${fx.stealOrClaim}席`);
  if (fx.demoteEnemy) parts.push(`动摇1敌席`);
  if (fx.lockClaimed) parts.push(`并锁定🔒`);
  if (fx.weakenAi) parts.push(`敌方减牌${fx.weakenAi}张（至少${MIN_ENEMY_CARDS}张）`);
  if (fx.freezeAi) parts.push(`敌方只出${MIN_ENEMY_CARDS}张，冻结 Boss 被动`);
  if (item?.affix) parts.push(`(${item.affix.desc})`);
  return parts.join(' ');
}

function executeCardEffects(item, s) {
  const card = CARD_DB[item.key];
  const fx = card.effects || {};
  const mod = item.affix?.mod || {};
  const toastParts = [];
  let lastSeat = null;

  if (card.category === 'influence' && !s.heroPassiveUsedThisTurn) {
    s.heroPassiveUsedThisTurn = true;
    s.influence = Math.min(100, s.influence + 5);
    toastParts.push('皮衣被动+5🌟');
  }

  const totalAp = (fx.gainAp || 0) + (mod.bonusAp || 0);
  if (totalAp > 0) {
    s.ap = Math.min(8, s.ap + totalAp);
    toastParts.push(`+${totalAp}💎`);
    SoundFX.playManaRefresh();
  }

  const totalCash = (fx.gainCash || 0) + (mod.bonusCash || 0);
  if (totalCash > 0) {
    s.cash += totalCash;
    toastParts.push(`+$${totalCash}万`);
  }

  const infGain = (fx.gainInf || 0) + (mod.bonusInf || 0);
  if (infGain !== 0) {
    s.influence = Math.max(0, Math.min(100, s.influence + infGain));
    toastParts.push(`+${infGain}🌟`);
  }
  if (mod.infPenalty > 0) {
    const paid = Math.min(s.influence, mod.infPenalty);
    const missing = mod.infPenalty - paid;
    s.influence -= paid;
    if (paid > 0) toastParts.push(`-${paid}🌟`);
    if (missing > 0) {
      const cashFine = missing * 50;
      s.cash = Math.max(0, s.cash - cashFine);
      toastParts.push(`公关补缴-$${cashFine}万`);
    }
  }

  const totalDraw = (fx.draw || 0) + (mod.bonusDraw || 0);
  if (totalDraw > 0) {
    drawCards(totalDraw);
    toastParts.push(`摸${totalDraw}牌`);
    SoundFX.playDeal(totalDraw);
  }

  const shouldLock = !!(fx.lockClaimed || mod.bonusLock);

  if (fx.claimNeutral) {
    for (let i = 0; i < fx.claimNeutral; i++) {
      const seat = claimNeutralSeat(s);
      if (seat) {
        if (shouldLock) seat.locked = true;
        lastSeat = seat;
        toastParts.push('+1席!');
      }
    }
  }
  if (fx.claimNeutralOrSteal) {
    for (let i = 0; i < fx.claimNeutralOrSteal; i++) {
      const seat = claimNeutralSeat(s) || stealEnemySeat(s);
      if (seat) {
        if (shouldLock) seat.locked = true;
        lastSeat = seat;
        toastParts.push('+1席!');
      }
    }
  }
  if (fx.stealEnemy) {
    for (let i = 0; i < fx.stealEnemy; i++) {
      const seat = stealEnemySeat(s) || claimNeutralSeat(s);
      if (seat) {
        if (shouldLock) seat.locked = true;
        lastSeat = seat;
        toastParts.push(shouldLock ? '抢锁+1席!' : '抢回+1席!');
      }
    }
  }
  if (fx.stealOrClaim) {
    let gained = 0;
    for (let i = 0; i < fx.stealOrClaim; i++) {
      const seat = stealEnemySeat(s) || claimNeutralSeat(s);
      if (seat) {
        if (shouldLock) seat.locked = true;
        lastSeat = seat;
        gained++;
      }
    }
    if (gained > 0) toastParts.push(shouldLock ? `夺锁+${gained}席!` : `夺取+${gained}席!`);
  }

  const totalDemote = (fx.demoteEnemy || 0) + (mod.bonusDemote || 0);
  for (let i = 0; i < totalDemote; i++) {
    const enemy = s.seats.find(x => x.owner === 'enemy' && !x.locked && !x.isCore);
    if (enemy) {
      enemy.owner = 'neutral';
      lastSeat = enemy;
      toastParts.push('敌席动摇!');
    }
  }

  const totalWeaken = (fx.weakenAi || 0) + (mod.bonusWeaken || 0);
  if (totalWeaken > 0) {
    s.aiPenalty = Math.min(2, s.aiPenalty + totalWeaken);
    toastParts.push('对手减牌');
  }

  if (fx.freezeAi) {
    s.aiFrozen = true;
    toastParts.push('Boss 被动冻结');
  }

  return {
    effect: toastParts.join(' ') || '已生效',
    targetSeatId: lastSeat?.id
  };
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function claimNeutralSeat(s) {
  const neutral = s.seats.find(x => x.owner === 'neutral');
  if (neutral) {
    neutral.owner = 'player';
    return neutral;
  }
  return null;
}

function stealEnemySeat(s) {
  const enemy = s.seats.find(x => x.owner === 'enemy' && !x.locked && !x.isCore);
  if (enemy) {
    enemy.owner = 'player';
    return enemy;
  }
  return null;
}

function rollAffixForStance(stanceId, card = null) {
  const r = Math.random();
  if (r < 0.25) {
    return NEGATIVE_AFFIXES[Math.floor(Math.random() * NEGATIVE_AFFIXES.length)];
  }
  if (r < 0.75) {
    let pool = STANCES[stanceId]?.affixes || STANCES.geek.affixes;
    if (card && card.apCost === 0) {
      pool = pool.filter(a => !a.mod?.apDiscount);
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }
  return null;
}

function drawCards(count) {
  for (let i = 0; i < count; i++) {
    if (state.hand.length >= 5) break;
    if (state.deck.length === 0) {
      if (state.discard.length === 0) break;
      state.deck = shuffle(state.discard);
      state.discard = [];
    }
    const key = state.deck.pop();
    state.hand.push({
      uid: `${key}_${Math.random().toString(36).slice(2, 7)}`,
      key,
      affix: rollAffixForStance(state.stance, CARD_DB[key])
    });
  }
}

function startStage(stageNum, keepResources = false) {
  const runBosses = (keepResources && state.runBosses) ? state.runBosses : pickRunBosses(3);
  const boss = runBosses[stageNum - 1];
  const baseEnemyCount = stageNum === 1 && boss.id !== 'baron_fund' ? 3 : 4;
  const extraLocks = (stageNum === 3 || boss.id === 'arthur_old') ? [7] : [];

  state = {
    stage: stageNum,
    runBosses,
    stance: state.stance || 'geek',
    turn: 1,
    maxTurns: 6,
    ap: 4,
    maxAp: 4,
    cash: keepResources ? Math.max(4500, Math.round(state.cash * 0.5) + 2500) : 5000,
    influence: keepResources ? Math.min(50, Math.max(20, state.influence)) : 20,
    jacketUses: 2,
    equityUses: 2,
    rallyUses: 2,
    powersUsedThisTurn: { jacket: false, equity: false, rally: false },
    mulliganUsedThisTurn: false,
    heroPassiveUsedThisTurn: false,
    aiFrozen: false,
    aiPenalty: 0,
    cardsPlayedThisTurn: 0,
    gameOver: false,
    seats: makeSeats(baseEnemyCount, extraLocks),
    deck: shuffle(DECK_RECIPE),
    hand: [],
    discard: [],
    enemyTaunt: boss.tauntStart
  };
  isAnimating = false;
  isEnemyTurn = false;
  isDiscardMode = false;
  drawCards(4);
  clearStage();
  renderAll();
}

function initGame() {
  state.stance = state.stance || 'geek';
  startStage(1, false);
}

function clearStage() {
  const stage = document.getElementById('clash-stage');
  stage.innerHTML = `<div class="stage-placeholder">第 ${state.stage} / 3 关 · ${getStageGoalText()}</div>`;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function showCardAnimation(cardObj, effectText, isEnemy, targetSeatId) {
  const activeState = state;
  SoundFX.playSlam(isEnemy);
  const stage = document.getElementById('clash-stage');
  const particles = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    const tx = Math.round(Math.cos(angle) * 95) + 'px';
    const ty = Math.round(Math.sin(angle) * 65) + 'px';
    return `<div class="fx-particle ${isEnemy ? 'enemy' : ''}" style="--tx:${tx};--ty:${ty};"></div>`;
  }).join('');

  const artPng = (cardObj.art || '').replace('.svg', '.png');
  stage.innerHTML = `
    <div class="clash-shockwave ${isEnemy ? 'enemy' : ''}"></div>
    ${particles}
    <div class="stage-card ${isEnemy ? 'enemy-card' : ''}">
      <img src="${artPng}" onerror="this.onerror=null;this.src='${cardObj.art}';" alt="${cardObj.title || cardObj.name}" />
      <div class="sc-title">${cardObj.category === 'rumor' ? '【风闻】' : ''}${cardObj.title || cardObj.name}</div>
      <div class="sc-effect">${effectText}</div>
    </div>
    <div class="float-toast ${isEnemy ? 'bad' : ''}">${effectText}</div>
  `;

  const hitPod = document.getElementById(isEnemy ? 'player-pod' : 'enemy-pod');
  if (hitPod) {
    hitPod.classList.remove('hero-hit');
    void hitPod.offsetWidth;
    hitPod.classList.add('hero-hit');
  }

  if (targetSeatId) {
    SoundFX.playSeatCapture(!isEnemy);
    renderSeats(targetSeatId);
  }
  await sleep(900);
  return state === activeState;
}

function renderSeats(flashSeatId = null) {
  const row = document.getElementById('seats-row');
  const boss = getCurrentBoss();
  row.innerHTML = '';
  state.seats.forEach(s => {
    const div = document.createElement('div');
    div.className = `seat-node owner-${s.owner} ${s.locked ? 'locked' : ''} ${flashSeatId === s.id ? 'flash-anim' : ''}`;
    const tag = s.owner === 'player' ? '我方' : s.owner === 'enemy' ? '敌方' : '中立';
    const portrait = s.isCore ? boss.portrait : s.portrait;
    const nameLabel = s.isCore ? `${s.name} · ${boss.name}` : s.name;
    div.innerHTML = `
      <span class="seat-portrait-frame">
        <img class="seat-portrait" src="${portraitSrc(portrait)}" alt="${s.isCore ? boss.name : ''}" />
        ${s.locked ? '<span class="seat-lock" role="img" aria-label="席位已锁定" title="席位已锁定">🔒</span>' : ''}
      </span>
      <span class="seat-name" title="${nameLabel}">${s.name}</span>
      <span class="seat-tag">${tag}</span>
    `;
    row.appendChild(div);
  });
}

function renderAll() {
  const boss = getCurrentBoss();
  const playerSeats = state.seats.filter(s => s.owner === 'player');
  const enemySeats = state.seats.filter(s => s.owner === 'enemy');
  const enemyLocked = enemySeats.filter(s => s.locked).length;

  document.getElementById('stage-badge').textContent = `第 ${state.stage} / 3 关`;
  document.getElementById('stage-win-rule').textContent = getStageGoalText();
  document.getElementById('turn-display').textContent = `第 ${state.turn} / ${state.maxTurns} 回合 · ${TURN_LABELS[state.turn - 1]}`;

  const bossPortrait = document.getElementById('boss-portrait');
  const bossPortraitSrc = portraitSrc(boss.portrait);
  if (bossPortrait.getAttribute('src') !== bossPortraitSrc) {
    bossPortrait.src = bossPortraitSrc;
    bossPortrait.alt = boss.name;
  }
  document.getElementById('boss-name').textContent = boss.name;
  document.getElementById('boss-title').textContent = `第 ${state.stage} 关 · ${boss.roleTitle}`;
  const bossPassiveEl = document.getElementById('boss-passive');
  bossPassiveEl.textContent = `被动：${boss.passiveName}`;
  bossPassiveEl.dataset.tooltip = `${boss.name} · ${boss.passiveName}\n${boss.passiveDesc}`;
  bossPassiveEl.style.cursor = 'help';

  const heroPassiveEl = document.querySelector('.hero-passive');
  if (heroPassiveEl) {
    heroPassiveEl.dataset.tooltip = '皮衣光环：每回合首次打出影响力牌时，额外 +5🌟 影响力';
  }

  document.getElementById('player-votes').textContent = playerSeats.length;
  document.getElementById('enemy-votes').textContent = enemySeats.length;
  document.getElementById('enemy-votes-bar').textContent = enemySeats.length;
  document.getElementById('player-lock-progress').textContent = `锁定 ${playerSeats.filter(s => s.locked).length} / ${BOARD_MAJORITY}`;
  const enemyLockProgress = document.getElementById('enemy-lock-progress');
  enemyLockProgress.textContent = `锁定 ${enemyLocked} / ${BOARD_MAJORITY}`;
  enemyLockProgress.dataset.danger = String(enemyLocked >= BOARD_MAJORITY - 1);
  document.getElementById('enemy-taunt').textContent = state.enemyTaunt;
  document.getElementById('stat-cash').textContent = `$${state.cash.toLocaleString()}万`;
  document.getElementById('stat-inf').textContent = `${state.influence}`;
  document.getElementById('stat-ap').textContent = `${state.ap} / ${state.maxAp}`;

  const gemsEl = document.getElementById('mana-gems');
  gemsEl.innerHTML = '';
  for (let i = 0; i < Math.max(state.maxAp, state.ap); i++) {
    const g = document.createElement('div');
    g.className = 'gem' + (i < state.ap ? ' full' : '');
    gemsEl.appendChild(g);
  }

  const jacketBtn = document.getElementById('btn-hero-jacket');
  document.getElementById('jacket-uses').textContent = `${state.jacketUses}/2`;
  jacketBtn.disabled = state.gameOver || isAnimating || state.jacketUses <= 0 || state.powersUsedThisTurn.jacket || state.ap < 2;
  jacketBtn.dataset.tooltip = state.jacketUses <= 0 ? '皮衣直播次数已用完（每关限2次）' : state.powersUsedThisTurn.jacket ? '本回合已使用过皮衣直播（每回合限1次）' : state.ap < 2 ? '无法使用：需要 2💎 体力' : '消耗 2💎，获得 +20🌟影响力并摸 1 张牌';

  const equityBtn = document.getElementById('btn-hero-equity');
  document.getElementById('equity-uses').textContent = `${state.equityUses}/2`;
  const hasUnlockPlayerSeat = state.seats.some(s => s.owner === 'player' && !s.locked);
  equityBtn.disabled = state.gameOver || isAnimating || state.equityUses <= 0 || state.powersUsedThisTurn.equity || state.ap < 1 || !hasUnlockPlayerSeat;
  equityBtn.dataset.tooltip = state.equityUses <= 0 ? '股权加锁次数已用完（每关限2次）' : state.powersUsedThisTurn.equity ? '本回合已使用过股权加锁（每回合限1次）' : !hasUnlockPlayerSeat ? '无法使用：场上暂无未锁定的我方席位' : state.ap < 1 ? '无法使用：需要 1💎 体力' : '消耗 1💎，永久锁定 1 个我方席位防止被对手抢走';

  const rallyBtn = document.getElementById('btn-hero-rally');
  document.getElementById('rally-uses').textContent = `${state.rallyUses}/2`;
  const hasTargetSeat = state.seats.some(s => s.owner === 'neutral' || (s.owner === 'enemy' && !s.locked && !s.isCore));
  rallyBtn.disabled = state.gameOver || isAnimating || state.rallyUses <= 0 || state.powersUsedThisTurn.rally || state.influence < 15 || !hasTargetSeat;
  rallyBtn.dataset.tooltip = state.rallyUses <= 0 ? '舆论号召次数已用完（每关限2次）' : state.powersUsedThisTurn.rally ? '本回合已使用过舆论号召（每回合限1次）' : state.influence < 15 ? `无法使用：需要 15🌟 影响力（当前 ${state.influence}🌟）` : !hasTargetSeat ? '无法使用：场上已无可用席位' : '消耗 15🌟 影响力（0💎体力），直接抢占 1 个中立或敌方未锁定席位！';

  renderSeats();

  document.getElementById('deck-count').textContent = state.deck.length;
  document.getElementById('discard-count').textContent = state.discard.length;
  const mulliganBtn = document.getElementById('btn-mulligan');
  if (mulliganBtn) {
    mulliganBtn.disabled = state.gameOver || isAnimating || state.mulliganUsedThisTurn || state.hand.length === 0;
    mulliganBtn.textContent = isDiscardMode ? '取消换牌' : state.mulliganUsedThisTurn ? '已换牌 (0/1)' : '换 1 张牌';
  }
  const handEl = document.getElementById('hand-cards');
  handEl.className = `hand-cards${isDiscardMode ? ' discard-mode' : ''}`;
  handEl.innerHTML = '';

  state.hand.forEach(item => {
    const c = CARD_DB[item.key];
    const cat = CATEGORY_META[c.category];
    const costs = getEffectiveCosts(item);
    const reason = getUnplayableReason(costs);
    const ok = !reason;
    const div = document.createElement('div');
    div.className = `hs-card rarity-${c.rarity} ${ok ? 'playable' : 'unplayable'}`;
    div.dataset.uid = item.uid;
    if (isDiscardMode) {
      div.dataset.tooltip = '点击弃掉此牌并重抽 1 张';
    } else if (!ok) {
      div.dataset.tooltip = `暂不可打出：${reason}`;
      div.dataset.tooltipWarn = '1';
    } else if (item.affix) {
      div.dataset.tooltip = `${item.affix.isNeg ? '负面新闻' : '随机词条'} · ${item.affix.name}：${item.affix.desc}`;
      if (item.affix.isNeg) div.dataset.tooltipWarn = '1';
    }

    const costBadges = [
      `<span class="gem-cost">${costs.ap}💎</span>`,
      costs.inf > 0 ? `<span class="inf-cost">${costs.inf}🌟</span>` : '',
      costs.cash > 0 ? `<span class="cash-cost">$${costs.cash}万</span>` : ''
    ].filter(Boolean).join('');

    const pngArt = c.art.replace('.svg', '.png');
    div.innerHTML = `
      <div class="card-costs">
        ${costBadges}
        <span class="cat-badge" style="color:${cat.color};border-color:${cat.color}44">${cat.label}</span>
      </div>
      <img src="${pngArt}" onerror="this.onerror=null;this.src='${c.art}';" alt="${c.title}" />
      <div class="hs-card-title">${c.title} <span class="rarity-gem">${RARITY_LABELS[c.rarity]}</span></div>
      ${item.affix ? `<div class="affix-tag ${item.affix.isNeg ? 'negative' : ''}">${item.affix.isNeg ? '⚠️' : '✨'} ${item.affix.name}</div>` : ''}
      ${!ok && !isDiscardMode ? `<div class="unplayable-reason">🚫 ${reason}</div>` : ''}
      <div class="hs-card-desc">${formatCardDesc(c, item)}</div>
    `;
    handEl.appendChild(div);
  });

  const endBtn = document.getElementById('btn-end-turn');
  endBtn.disabled = state.gameOver || isAnimating;
  endBtn.textContent = isEnemyTurn ? '对手出牌中...' : '结束回合';
  const enemyTurnPreview = document.getElementById('enemy-turn-preview');
  enemyTurnPreview.hidden = state.gameOver || isEnemyTurn;
  enemyTurnPreview.textContent = `敌方将出 ${getEnemyCardCount(state)} 张牌`;

  const cfg = getAiConfig();
  document.getElementById('ai-mode-text').textContent = cfg.engine === 'llm' && cfg.key ? `模型(${cfg.model})` : '对手设置';
}

function checkStageWin() {
  const pVotes = state.seats.filter(s => s.owner === 'player').length;
  const pLocked = state.seats.filter(s => s.owner === 'player' && s.locked).length;
  if (pVotes >= INSTANT_WIN_SEATS[state.stage - 1] || pLocked >= BOARD_MAJORITY) {
    handleStageCleared(pVotes, pLocked);
    return true;
  }
  return false;
}

function checkStageDefeat() {
  const eLocked = state.seats.filter(s => s.owner === 'enemy' && s.locked).length;
  if (eLocked >= BOARD_MAJORITY) {
    showEndModal(
      `止步第 ${state.stage} 关`,
      `对手已锁定 ${eLocked} 个席位，场上剩余席位已不足 ${BOARD_MAJORITY} 席，本关夺权失败。`,
      false,
      '重新开始'
    );
    return true;
  }
  return false;
}

function handleStageCleared(pVotes, pLocked = 0) {
  const boss = getCurrentBoss();
  const score = `第 ${state.turn} 回合拿下 ${pVotes}/9 席，锁定 ${pLocked} 席。`;
  const winReason = pLocked >= BOARD_MAJORITY ? `锁定 ${pLocked} 席直接控制董事会` : `以 ${pVotes} / 9 席拿下本关`;
  if (state.stage < 3) {
    const nextBoss = state.runBosses[state.stage];
    showEndModal(
      `击败第 ${state.stage} 关：${boss.name}`,
      `你${winReason}，按 50% 结余保留资金并获得 $2,500万 战利品补助（保底 $4,500万）。下一关对手：${nextBoss.name}（${nextBoss.roleTitle}）。`,
      true,
      `进入第 ${state.stage + 1} 关`,
      `我在《${document.title}》第 ${state.stage} 关击败了 ${boss.name}！${score}`
    );
  } else {
    const names = state.runBosses.map(b => b.name).join(' → ');
    showEndModal(
      `连克三关，重返 CEO 宝座`,
      `你从 0 席起步，连续击败 ${names}，重新执掌董事会。`,
      true,
      '再来一局',
      `我在《${document.title}》连克三关，重返 CEO 宝座！\n对手：${names}\n决胜关：${score}`
    );
  }
}

function getXShareUrl(text, pageUrl = '') {
  const intent = new URL('https://twitter.com/intent/tweet');
  intent.searchParams.set('text', text);
  intent.searchParams.set('hashtags', 'BackToCEO');
  if (pageUrl) intent.searchParams.set('url', pageUrl);
  return intent.href;
}

function showEndModal(title, desc, isWin = false, btnLabel = '🔄 再来一局', shareText = '') {
  state.gameOver = true;
  SoundFX.playEnd(isWin);
  renderAll();
  document.getElementById('end-title').textContent = title;
  document.getElementById('end-desc').textContent = desc;
  const sceneImg = document.getElementById('end-scene-img');
  if (sceneImg) {
    const base = isWin ? 'assets/ending_victory' : 'assets/ending_defeat';
    sceneImg.style.display = 'block';
    sceneImg.onerror = () => {
      sceneImg.onerror = () => { sceneImg.style.display = 'none'; };
      sceneImg.src = `${base}.svg`;
    };
    sceneImg.src = `${base}.png`;
  }
  const btn = document.getElementById('btn-play-again');
  btn.textContent = btnLabel;
  btn.dataset.nextStage = isWin && state.stage < 3 ? String(state.stage + 1) : '1';
  btn.dataset.keep = isWin && state.stage < 3 ? '1' : '0';
  const shareLink = document.getElementById('btn-share-x');
  shareLink.hidden = !isWin || !shareText;
  if (shareLink.hidden) {
    shareLink.removeAttribute('href');
  } else {
    shareLink.href = getXShareUrl(shareText);
  }
  document.getElementById('modal-end').style.display = 'flex';
}

const tooltipEl = document.createElement('div');
tooltipEl.className = 'custom-tooltip';
tooltipEl.style.display = 'none';
document.body.appendChild(tooltipEl);

document.addEventListener('mouseover', e => {
  const target = e.target.closest('[data-tooltip]');
  if (!target || !target.dataset.tooltip) {
    tooltipEl.style.display = 'none';
    return;
  }
  tooltipEl.textContent = target.dataset.tooltip;
  tooltipEl.className = `custom-tooltip ${target.dataset.tooltipWarn ? 'warn' : ''}`;
  tooltipEl.style.display = 'block';
});

document.addEventListener('mousemove', e => {
  if (tooltipEl.style.display !== 'block') return;
  const x = Math.min(window.innerWidth - 295, e.clientX + 14);
  const y = e.clientY > window.innerHeight - 130 ? e.clientY - tooltipEl.offsetHeight - 12 : e.clientY + 14;
  tooltipEl.style.left = `${Math.max(8, x)}px`;
  tooltipEl.style.top = `${Math.max(8, y)}px`;
});

document.addEventListener('mouseout', e => {
  if (!e.relatedTarget || !e.relatedTarget.closest?.('[data-tooltip]')) {
    tooltipEl.style.display = 'none';
  }
});

document.getElementById('btn-mulligan')?.addEventListener('click', () => {
  if (isAnimating || state.gameOver || state.mulliganUsedThisTurn || state.hand.length === 0) return;
  isDiscardMode = !isDiscardMode;
  renderAll();
});

document.getElementById('hand-cards').addEventListener('click', async e => {
  if (isAnimating || state.gameOver) return;
  const cardEl = e.target.closest('.hs-card');
  if (!cardEl) return;
  const idx = state.hand.findIndex(h => h.uid === cardEl.dataset.uid);
  if (idx === -1) return;

  const item = state.hand[idx];
  if (isDiscardMode) {
    isDiscardMode = false;
    state.mulliganUsedThisTurn = true;
    state.hand.splice(idx, 1);
    state.discard.push(item.key);
    drawCards(1);
    SoundFX.playDeal(1);
    renderAll();
    return;
  }
  const tpl = CARD_DB[item.key];
  const costs = getEffectiveCosts(item);
  const reason = getUnplayableReason(costs);
  if (reason) {
    const stage = document.getElementById('clash-stage');
    const oldToast = stage.querySelector('.float-toast');
    if (oldToast) oldToast.remove();
    const toast = document.createElement('div');
    toast.className = 'float-toast bad';
    toast.textContent = `🚫 ${reason}`;
    stage.appendChild(toast);
    return;
  }

  isAnimating = true;
  state.ap -= costs.ap;
  state.cash -= costs.cash;
  state.influence -= costs.inf;
  state.hand.splice(idx, 1);
  state.discard.push(item.key);
  state.cardsPlayedThisTurn += 1;

  const res = executeCardEffects(item, state);
  renderAll();
  if (!await showCardAnimation(tpl, res.effect, false, res.targetSeatId)) return;

  isAnimating = false;
  if (!checkStageWin()) renderAll();
});

document.getElementById('btn-hero-jacket').addEventListener('click', async () => {
  if (isAnimating || state.gameOver || state.jacketUses <= 0 || state.powersUsedThisTurn.jacket || state.ap < 2) return;
  isAnimating = true;
  state.ap -= 2;
  state.jacketUses -= 1;
  state.powersUsedThisTurn.jacket = true;
  state.influence = Math.min(100, state.influence + 20);
  drawCards(1);
  SoundFX.playDeal(1);
  renderAll();
  if (!await showCardAnimation({ art: 'assets/card_pr.svg', title: '🧥 传说皮衣·厨房直播' }, '+20🌟 & 摸1牌!', false, null)) return;
  isAnimating = false;
  renderAll();
});

document.getElementById('btn-hero-equity').addEventListener('click', async () => {
  if (isAnimating || state.gameOver || state.equityUses <= 0 || state.powersUsedThisTurn.equity || state.ap < 1) return;
  const target = state.seats.find(s => s.owner === 'player' && !s.locked);
  if (!target) return;

  isAnimating = true;
  state.ap -= 1;
  state.equityUses -= 1;
  state.powersUsedThisTurn.equity = true;
  target.locked = true;
  renderAll();
  if (!await showCardAnimation({ art: 'assets/card_banquet.svg', title: '📜 1.5% 股权加锁' }, `🔒 永久锁住 ${target.name}!`, false, target.id)) return;
  isAnimating = false;
  if (!checkStageWin()) renderAll();
});

document.getElementById('btn-hero-rally').addEventListener('click', async () => {
  if (isAnimating || state.gameOver || state.rallyUses <= 0 || state.powersUsedThisTurn.rally || state.influence < 15) return;
  const seat = claimNeutralSeat(state) || stealEnemySeat(state);
  if (!seat) return;

  isAnimating = true;
  state.rallyUses -= 1;
  state.powersUsedThisTurn.rally = true;
  state.influence -= 15;
  renderAll();
  if (!await showCardAnimation({ art: 'assets/card_pr.svg', title: '📣 舆论号召' }, `消耗15🌟 抢占${seat.name}!`, false, seat.id)) return;
  isAnimating = false;
  if (!checkStageWin()) renderAll();
});

document.getElementById('btn-end-turn').addEventListener('click', async () => {
  if (isAnimating || state.gameOver) return;
  const turnState = state;
  isAnimating = true;
  isEnemyTurn = true;
  renderAll();

  try {
    const boss = getCurrentBoss();
    const aiCount = getEnemyCardCount(state);
    const freezeBoss = state.aiFrozen;
    const cfg = getAiConfig();
    const playedCardIds = new Set();
    let lastCardId = null;
    state.aiFrozen = false;
    state.aiPenalty = 0;

    for (let i = 0; i < aiCount; i++) {
      if (playedCardIds.size === AI_CARDS.length) {
        playedCardIds.clear();
        playedCardIds.add(lastCardId);
      }
      const aiRes = cfg.engine === 'llm' && cfg.key
        ? await runLlmAi(state, cfg, playedCardIds, boss)
        : runBuiltinAi(state, cfg.personality || 'balanced', playedCardIds);
      if (state !== turnState) return;

      lastCardId = aiRes.card.id;
      playedCardIds.add(lastCardId);
      state.enemyTaunt = aiRes.taunt;
      const outcome = executeEnemyEffects(aiRes.card, state);
      renderAll();
      if (!await showCardAnimation(aiRes.card, outcome.floatText, true, outcome.targetSeatId)) return;
      if (checkStageDefeat()) return;
    }

    if (freezeBoss) {
      state.enemyTaunt = '“可恶……700人联名信压下了我的额外行动！”';
    } else {
      const passiveRes = boss.onTurnEnd(state);
      if (passiveRes) {
        state.enemyTaunt = passiveRes.text;
        renderAll();
        renderSeats(passiveRes.targetSeatId);
        await sleep(650);
        if (state !== turnState) return;
        if (checkStageDefeat()) return;
      }
    }

    if (state.turn >= state.maxTurns) {
      const pVotes = state.seats.filter(s => s.owner === 'player').length;
      const pLocked = state.seats.filter(s => s.owner === 'player' && s.locked).length;
      isEnemyTurn = false;
      isAnimating = false;
      if (pVotes >= BOARD_MAJORITY) {
        handleStageCleared(pVotes, pLocked);
      } else {
        showEndModal(`止步第 ${state.stage} 关`, `${state.maxTurns} 回合结束，你仅获得 ${pVotes} 席（未满 ${BOARD_MAJORITY} 席），未能击败 ${boss.name}。`, false, '重新开始');
      }
      return;
    }

    state.turn += 1;
    state.maxAp = Math.min(6, 3 + Math.ceil(state.turn / 2));
    state.ap = state.maxAp;
    state.heroPassiveUsedThisTurn = false;
    state.powersUsedThisTurn = { jacket: false, equity: false, rally: false };
    state.mulliganUsedThisTurn = false;
    state.cardsPlayedThisTurn = 0;
    isDiscardMode = false;
    drawCards(2);
    SoundFX.playManaRefresh();
    SoundFX.playDeal(2);
    clearStage();
  } catch (err) {
    console.error('结束回合执行出错:', err);
  } finally {
    if (state === turnState) {
      isEnemyTurn = false;
      isAnimating = false;
      renderAll();
    }
  }
});

document.getElementById('btn-sound-toggle').addEventListener('click', () => {
  const muted = SoundFX.toggleMute();
  document.getElementById('btn-sound-toggle').textContent = muted ? '🔇 静音' : '🔊 音效开';
});

document.getElementById('btn-restart').addEventListener('click', () => {
  initGame();
  SoundFX.playDeal(4);
});

document.getElementById('btn-share-game').addEventListener('click', () => {
  const canonical = document.querySelector('meta[property="og:url"]').content.trim();
  const pageUrl = new URL(canonical || window.location.href);
  pageUrl.search = '';
  pageUrl.hash = '';
  pageUrl.username = '';
  pageUrl.password = '';

  const host = pageUrl.hostname.replace(/\.$/, '');
  const isLocalHost = !host.includes('.') || /\.(local|localhost)$/.test(host) || /^(\d+\.){3}\d+$/.test(host);
  const isPublic = /^https?:$/.test(pageUrl.protocol) && (Boolean(canonical) || !isLocalHost);
  const publicUrl = isPublic ? pageUrl.href : '';
  document.getElementById('game-share-url-label').textContent = isPublic ? '分享链接' : '当前地址';
  document.getElementById('game-share-url').value = pageUrl.href;
  document.getElementById('game-share-local-hint').hidden = isPublic;
  const shareLink = document.getElementById('game-share-x');
  shareLink.href = getXShareUrl(document.title, publicUrl);
  shareLink.textContent = isPublic ? '分享到 X' : '测试 X 发帖';
  document.getElementById('game-share-dialog').showModal();
});

document.getElementById('btn-play-again').addEventListener('click', e => {
  const nextStage = Number(e.target.dataset.nextStage || 1);
  const keep = e.target.dataset.keep === '1';
  document.getElementById('modal-end').style.display = 'none';
  startStage(nextStage, keep);
  SoundFX.playDeal(4);
});

const modalAi = document.getElementById('modal-ai');
document.getElementById('btn-ai-config').addEventListener('click', () => {
  const cfg = getAiConfig();
  document.querySelector(`input[name="ai-engine"][value="${cfg.engine}"]`).checked = true;
  document.getElementById('ai-personality').value = cfg.personality || 'balanced';
  document.getElementById('llm-url').value = cfg.url || 'https://api.openai.com/v1/chat/completions';
  document.getElementById('llm-model').value = cfg.model || 'gpt-4o-mini';
  document.getElementById('llm-key').value = cfg.key || '';
  document.getElementById('builtin-settings').style.display = cfg.engine === 'builtin' ? 'flex' : 'none';
  document.getElementById('llm-settings').style.display = cfg.engine === 'llm' ? 'flex' : 'none';
  modalAi.style.display = 'flex';
});
document.getElementById('btn-close-ai').addEventListener('click', () => (modalAi.style.display = 'none'));
document.querySelectorAll('input[name="ai-engine"]').forEach(r => {
  r.addEventListener('change', e => {
    document.getElementById('builtin-settings').style.display = e.target.value === 'builtin' ? 'flex' : 'none';
    document.getElementById('llm-settings').style.display = e.target.value === 'llm' ? 'flex' : 'none';
  });
});
document.getElementById('btn-save-ai').addEventListener('click', () => {
  const engine = document.querySelector('input[name="ai-engine"]:checked').value;
  saveAiConfig({
    engine,
    personality: document.getElementById('ai-personality').value,
    url: document.getElementById('llm-url').value,
    model: document.getElementById('llm-model').value,
    key: document.getElementById('llm-key').value
  });
  modalAi.style.display = 'none';
  renderAll();
});

initGame();
