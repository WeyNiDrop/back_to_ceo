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

// 按卡牌类别匹配的虚构商战负面新闻词条
const NEGATIVE_AFFIXES = [
  { name: '间谍门泄密', categories: ['spy'], desc: '打出后 -8🌟', isNeg: true, mod: { infPenalty: 8 } },
  { name: '酒店录像曝光', categories: ['spy', 'influence'], desc: '体力消耗 +1💎', isNeg: true, mod: { apPenalty: 1 } },
  { name: '开支预算争议', categories: ['stamina', 'politics'], desc: '额外 -$500万', isNeg: true, mod: { cashPenalty: 500 } },
  { name: '国会闭门听证', categories: ['politics'], desc: '需影响力 ≥20🌟', isNeg: true, mod: { infReqPenalty: 20 } },
  { name: 'DOJ三线调查', categories: ['spy', 'politics'], desc: '律师费 +$400万', isNeg: true, mod: { cashPenalty: 400 } },
  { name: '微波炉蒸鱼未加盖', categories: ['stamina'], desc: '打出后 -5🌟', isNeg: true, mod: { infPenalty: 5 } },
  { name: '团队沟通失当', categories: ['influence', 'spy'], desc: '体力 +1💎 且打出后 -6🌟', isNeg: true, mod: { apPenalty: 1, infPenalty: 6 } },
  { name: '董事会问责', categories: ['politics'], desc: '需 ≥25🌟 且额外 -$400万', isNeg: true, mod: { infReqPenalty: 25, cashPenalty: 400 } }
];

// 19张统一4大类卡牌库（支持 apCost / cashCost / infCost 消耗）
const CARD_DB = {
  chimaek: { id: 'chimaek', title: '炸鸡啤酒套餐', category: 'stamina', rarity: 'common', art: 'assets/card_supply.svg', apCost: 0, cashCost: 100, infCost: 0, allowNegativeAffix: false, effects: { gainAp: 2 } },
  coffee: { id: 'coffee', title: 'Denny\'s 苦咖啡', category: 'stamina', rarity: 'common', art: 'assets/card_supply.svg', apCost: 0, cashCost: 0, infCost: 0, allowNegativeAffix: false, effects: { gainAp: 1, draw: 1 } },
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
  spy_cctv: { id: 'spy_cctv', title: '酒店监控实锤', category: 'spy', rarity: 'rare', art: 'assets/card_intel.svg', apCost: 2, cashCost: 800, infCost: 0, effects: { stealEnemy: 1, gainInf: 10, weakenAi: 1 } },
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
let runStartedAt = null;
let runFinishedSeconds = null;
let runTimerId;

function getRunSeconds() {
  if (runFinishedSeconds !== null) return runFinishedSeconds;
  return runStartedAt === null ? 0 : Math.floor((performance.now() - runStartedAt) / 1000);
}

function formatRunTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const parts = [minutes % 60, seconds % 60];
  if (minutes >= 60) parts.unshift(Math.floor(minutes / 60));
  return parts.map(part => String(part).padStart(2, '0')).join(':');
}

function renderRunTime(elementId, seconds) {
  const clock = document.getElementById(elementId);
  clock.textContent = formatRunTime(seconds);
  clock.dateTime = `PT${seconds}S`;
}

function updateRunTimer() {
  renderRunTime('run-time', getRunSeconds());
}

function startRunTimer() {
  if (runStartedAt !== null) return;
  runStartedAt = performance.now();
  runTimerId = setInterval(updateRunTimer, 1000);
}

function stopRunTimer() {
  runFinishedSeconds = getRunSeconds();
  clearInterval(runTimerId);
  updateRunTimer();
  return runFinishedSeconds;
}

function resetRunTimer() {
  clearInterval(runTimerId);
  runStartedAt = null;
  runFinishedSeconds = null;
  updateRunTimer();
}

function getCurrentBoss() {
  return (state.runBosses && state.runBosses[state.stage - 1]) || AI_BOSS_POOL[0];
}

function getEnemyCardCount(turnState) {
  if (turnState.aiFrozen) return MIN_ENEMY_CARDS;
  return Math.max(MIN_ENEMY_CARDS, turnState.cardsPlayedThisTurn - turnState.aiPenalty);
}

function getStageGoalText() {
  const instantSeats = INSTANT_WIN_SEATS[state.stage - 1];
  return translate("占 {0} 席或锁 {1} 席即胜（第 {2} 回合末 ≥{3} 席晋级）", instantSeats, BOARD_MAJORITY, state.maxTurns, BOARD_MAJORITY);
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
  if (state.gameOver) return translate("本局已结束");
  if (isAnimating) return isEnemyTurn ? translate("对手回合演出中") : translate("出牌动画播放中");
  const reasons = [];
  if (state.ap < costs.ap) reasons.push(translate("缺体力(需{0}💎)", costs.ap));
  if (state.cash < costs.cash) reasons.push(translate("缺资金(需{0})", formatCash(costs.cash)));
  const needInf = Math.max(costs.inf, costs.infReq || 0);
  if (state.influence < needInf) reasons.push(translate("缺影响力(需{0}🌟)", needInf));
  return reasons.join(' · ');
}

function formatCardDesc(card, item) {
  const fx = card.effects || {};
  const parts = [];
  if (fx.gainAp) parts.push(`+${fx.gainAp}💎`);
  if (fx.gainCash) parts.push(translate("+{0}", formatCash(fx.gainCash)));
  if (fx.gainInf) parts.push(`+${fx.gainInf}🌟`);
  if (fx.draw) parts.push(translate("摸{0}牌", fx.draw));
  if (fx.claimNeutral) parts.push(translate("抢{0}中立席", fx.claimNeutral));
  if (fx.claimNeutralOrSteal) parts.push(translate("夺{0}席（中立优先）", fx.claimNeutralOrSteal));
  const enemyFirstSeats = (fx.stealEnemy || 0) + (fx.stealOrClaim || 0);
  if (enemyFirstSeats) parts.push(translate("夺{0}席（敌席优先）", enemyFirstSeats));
  if (fx.demoteEnemy) parts.push(translate("动摇1敌席"));
  if (fx.lockClaimed) parts.push(translate("并锁定🔒"));
  if (fx.weakenAi) parts.push(translate("敌方减牌{0}张（至少{1}张）", fx.weakenAi, MIN_ENEMY_CARDS));
  if (fx.freezeAi) parts.push(translate("敌方只出{0}张，冻结 Boss 被动", MIN_ENEMY_CARDS));
  if (item?.affix) parts.push(`(${translate(item.affix.desc)})`);
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
    const gained = Math.min(5, 100 - s.influence);
    s.influence += gained;
    if (gained > 0) toastParts.push(translate("皮衣被动+{0}🌟", gained));
  }

  const gainedAp = Math.min(8 - s.ap, (fx.gainAp || 0) + (mod.bonusAp || 0));
  if (gainedAp > 0) {
    s.ap += gainedAp;
    toastParts.push(`+${gainedAp}💎`);
    SoundFX.playManaRefresh();
  }

  const totalCash = (fx.gainCash || 0) + (mod.bonusCash || 0);
  if (totalCash > 0) {
    s.cash += totalCash;
    toastParts.push(translate("+{0}", formatCash(totalCash)));
  }

  const gainedInfluence = Math.min(100 - s.influence, (fx.gainInf || 0) + (mod.bonusInf || 0));
  if (gainedInfluence > 0) {
    s.influence += gainedInfluence;
    toastParts.push(`+${gainedInfluence}🌟`);
  }
  if (mod.infPenalty > 0) {
    const paid = Math.min(s.influence, mod.infPenalty);
    const missing = mod.infPenalty - paid;
    s.influence -= paid;
    if (paid > 0) toastParts.push(`-${paid}🌟`);
    const cashFine = Math.min(s.cash, missing * 50);
    if (cashFine > 0) {
      s.cash -= cashFine;
      toastParts.push(translate("公关补缴-{0}", formatCash(cashFine)));
    }
  }

  const totalDraw = (fx.draw || 0) + (mod.bonusDraw || 0);
  if (totalDraw > 0) {
    const drawn = drawCards(totalDraw);
    if (drawn > 0) {
      toastParts.push(translate("摸{0}牌", drawn));
      SoundFX.playDeal(drawn);
    }
  }

  const shouldLock = !!(fx.lockClaimed || mod.bonusLock);

  if (fx.claimNeutral) {
    for (let i = 0; i < fx.claimNeutral; i++) {
      const seat = claimNeutralSeat(s);
      if (seat) {
        if (shouldLock) seat.locked = true;
        lastSeat = seat;
        toastParts.push(translate("+1席!"));
      }
    }
  }
  if (fx.claimNeutralOrSteal) {
    for (let i = 0; i < fx.claimNeutralOrSteal; i++) {
      const seat = claimNeutralSeat(s) || stealEnemySeat(s);
      if (seat) {
        if (shouldLock) seat.locked = true;
        lastSeat = seat;
        toastParts.push(translate("+1席!"));
      }
    }
  }
  if (fx.stealEnemy) {
    for (let i = 0; i < fx.stealEnemy; i++) {
      const seat = stealEnemySeat(s) || claimNeutralSeat(s);
      if (seat) {
        if (shouldLock) seat.locked = true;
        lastSeat = seat;
        toastParts.push(shouldLock ? translate("抢锁+1席!") : translate("抢回+1席!"));
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
    if (gained > 0) toastParts.push(shouldLock ? translate("夺锁+{0}席!", gained) : translate("夺取+{0}席!", gained));
  }

  const totalDemote = (fx.demoteEnemy || 0) + (mod.bonusDemote || 0);
  for (let i = 0; i < totalDemote; i++) {
    const enemy = s.seats.find(x => x.owner === 'enemy' && !x.locked && !x.isCore);
    if (enemy) {
      enemy.owner = 'neutral';
      lastSeat = enemy;
      toastParts.push(translate("敌席动摇!"));
    }
  }

  const totalWeaken = (fx.weakenAi || 0) + (mod.bonusWeaken || 0);
  if (totalWeaken > 0) {
    s.aiPenalty = Math.min(2, s.aiPenalty + totalWeaken);
    toastParts.push(translate("对手减牌"));
  }

  if (fx.freezeAi) {
    s.aiFrozen = true;
    toastParts.push(translate("Boss 被动冻结"));
  }

  return {
    effect: toastParts.join(' ') || translate("未触发效果"),
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
    if (card?.allowNegativeAffix === false) return null;
    const pool = card ? NEGATIVE_AFFIXES.filter(affix => affix.categories.includes(card.category)) : NEGATIVE_AFFIXES;
    return pool[Math.floor(Math.random() * pool.length)] ?? null;
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
  const handSize = state.hand.length;
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
  return state.hand.length - handSize;
}

function startStage(stageNum, keepResources = false) {
  if (!keepResources) resetRunTimer();
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
  stage.innerHTML = `<div class="stage-placeholder"><strong>${translate("第 {0} / 3 关", state.stage)}</strong><span>${getStageGoalText()}</span></div>`;
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
  const cardTitle = translate(cardObj.title || cardObj.name);
  stage.innerHTML = `
    <div class="clash-shockwave ${isEnemy ? 'enemy' : ''}"></div>
    ${particles}
    <div class="stage-card ${isEnemy ? 'enemy-card' : ''}">
      <img src="${artPng}" onerror="this.onerror=null;this.src='${cardObj.art}';" alt="" />
      <div class="sc-title">${cardObj.category === 'rumor' ? translate("【风闻】") : ''}${cardTitle}</div>
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
    const tag = s.owner === 'player' ? translate("我方") : s.owner === 'enemy' ? translate("敌方") : translate("中立");
    const portrait = s.isCore ? boss.portrait : s.portrait;
    const name = translate(s.name);
    const nameLabel = s.isCore ? `${name} · ${boss.name}` : name;
    const lockLabel = translate("席位已锁定");
    div.innerHTML = `
      <span class="seat-portrait-frame">
        <img class="seat-portrait" src="${portraitSrc(portrait)}" alt="${s.isCore ? boss.name : ''}" />
        ${s.locked ? `<span class="seat-lock" role="img" aria-label="${lockLabel}" title="${lockLabel}">🔒</span>` : ''}
      </span>
      <span class="seat-name" title="${nameLabel}">${name}</span>
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

  document.getElementById('stage-badge').textContent = translate("第 {0} / 3 关", state.stage);
  document.getElementById('stage-win-rule').textContent = getStageGoalText();
  document.getElementById('turn-display').textContent = translate("第 {0} / {1} 回合 · {2}", state.turn, state.maxTurns, translate(TURN_LABELS[state.turn - 1]));

  const bossPortrait = document.getElementById('boss-portrait');
  const bossPortraitSrc = portraitSrc(boss.portrait);
  if (bossPortrait.getAttribute('src') !== bossPortraitSrc) {
    bossPortrait.src = bossPortraitSrc;
    bossPortrait.alt = boss.name;
  }
  document.getElementById('boss-name').textContent = boss.name;
  document.getElementById('boss-title').textContent = translate("第 {0} 关 · {1}", state.stage, translate(boss.roleTitle));
  const bossPassiveEl = document.getElementById('boss-passive');
  bossPassiveEl.textContent = translate("被动：{0}", translate(boss.passiveName));
  bossPassiveEl.dataset.tooltip = `${boss.name} · ${translate(boss.passiveName)}\n${translate(boss.passiveDesc)}`;

  const heroPassiveEl = document.querySelector('.hero-passive');
  if (heroPassiveEl) {
    heroPassiveEl.dataset.tooltip = translate("皮衣光环：每回合首次打出影响力牌时，额外 +5🌟 影响力");
  }

  document.getElementById('player-votes').textContent = playerSeats.length;
  document.getElementById('enemy-votes').textContent = enemySeats.length;
  document.getElementById('enemy-votes-bar').textContent = enemySeats.length;
  document.getElementById('player-lock-progress').textContent = translate("锁定 {0} / {1}", playerSeats.filter(s => s.locked).length, BOARD_MAJORITY);
  const enemyLockProgress = document.getElementById('enemy-lock-progress');
  enemyLockProgress.textContent = translate("锁定 {0} / {1}", enemyLocked, BOARD_MAJORITY);
  enemyLockProgress.dataset.danger = String(enemyLocked >= BOARD_MAJORITY - 1);
  document.getElementById('enemy-taunt').textContent = translate(state.enemyTaunt);
  document.getElementById('stat-cash').textContent = formatCash(state.cash);
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
  jacketBtn.dataset.tooltip = state.jacketUses <= 0 ? translate("皮衣直播次数已用完（每关限2次）") : state.powersUsedThisTurn.jacket ? translate("本回合已使用过皮衣直播（每回合限1次）") : state.ap < 2 ? translate("无法使用：需要 2💎 体力") : translate("消耗 2💎，获得 +20🌟影响力并摸 1 张牌");

  const equityBtn = document.getElementById('btn-hero-equity');
  document.getElementById('equity-uses').textContent = `${state.equityUses}/2`;
  const hasUnlockPlayerSeat = state.seats.some(s => s.owner === 'player' && !s.locked);
  equityBtn.disabled = state.gameOver || isAnimating || state.equityUses <= 0 || state.powersUsedThisTurn.equity || state.ap < 1 || !hasUnlockPlayerSeat;
  equityBtn.dataset.tooltip = state.equityUses <= 0 ? translate("股权加锁次数已用完（每关限2次）") : state.powersUsedThisTurn.equity ? translate("本回合已使用过股权加锁（每回合限1次）") : !hasUnlockPlayerSeat ? translate("无法使用：场上暂无未锁定的我方席位") : state.ap < 1 ? translate("无法使用：需要 1💎 体力") : translate("消耗 1💎，永久锁定 1 个我方席位防止被对手抢走");

  const rallyBtn = document.getElementById('btn-hero-rally');
  document.getElementById('rally-uses').textContent = `${state.rallyUses}/2`;
  const hasTargetSeat = state.seats.some(s => s.owner === 'neutral' || (s.owner === 'enemy' && !s.locked && !s.isCore));
  rallyBtn.disabled = state.gameOver || isAnimating || state.rallyUses <= 0 || state.powersUsedThisTurn.rally || state.influence < 15 || !hasTargetSeat;
  rallyBtn.dataset.tooltip = state.rallyUses <= 0 ? translate("舆论号召次数已用完（每关限2次）") : state.powersUsedThisTurn.rally ? translate("本回合已使用过舆论号召（每回合限1次）") : state.influence < 15 ? translate("无法使用：需要 15🌟 影响力（当前 {0}🌟）", state.influence) : !hasTargetSeat ? translate("无法使用：场上已无可用席位") : translate("消耗 15🌟 影响力（0💎体力），直接抢占 1 个中立或敌方未锁定席位！");

  renderSeats();

  document.getElementById('deck-count').textContent = state.deck.length;
  document.getElementById('discard-count').textContent = state.discard.length;
  const mulliganBtn = document.getElementById('btn-mulligan');
  if (mulliganBtn) {
    mulliganBtn.disabled = state.gameOver || isAnimating || state.mulliganUsedThisTurn || state.hand.length === 0;
    mulliganBtn.textContent = isDiscardMode ? translate("取消换牌") : state.mulliganUsedThisTurn ? translate("已换牌 (0/1)") : translate("换 1 张牌");
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
      div.dataset.tooltip = translate("点击弃掉此牌并重抽 1 张");
    } else if (!ok) {
      div.dataset.tooltip = translate("暂不可打出：{0}", reason);
      div.dataset.tooltipWarn = '1';
    } else if (item.affix) {
      div.dataset.tooltip = `${item.affix.isNeg ? translate("负面新闻") : translate("随机词条")} · ${translate(item.affix.name)}\n${translate(item.affix.desc)}`;
      if (item.affix.isNeg) div.dataset.tooltipWarn = '1';
    }

    const costBadges = [
      `<span class="gem-cost">${costs.ap}💎</span>`,
      costs.inf > 0 ? `<span class="inf-cost">${costs.inf}🌟</span>` : '',
      costs.cash > 0 ? `<span class="cash-cost">${formatCash(costs.cash)}</span>` : ''
    ].filter(Boolean).join('');

    const pngArt = c.art.replace('.svg', '.png');
    div.innerHTML = `
      <div class="card-costs">
        ${costBadges}
        <span class="cat-badge" style="color:${cat.color};border-color:${cat.color}44">${translate(cat.label)}</span>
      </div>
      <img src="${pngArt}" onerror="this.onerror=null;this.src='${c.art}';" alt="" />
      <div class="hs-card-title">${translate(c.title)} <span class="rarity-gem">${translate(RARITY_LABELS[c.rarity])}</span></div>
      ${item.affix ? `<div class="affix-tag ${item.affix.isNeg ? 'negative' : ''}">${item.affix.isNeg ? '⚠️' : '✨'} ${translate(item.affix.name)}</div>` : ''}
      ${!ok && !isDiscardMode ? `<div class="unplayable-reason">🚫 ${reason}</div>` : ''}
      <div class="hs-card-desc">${formatCardDesc(c, item)}</div>
    `;
    handEl.appendChild(div);
  });

  const endBtn = document.getElementById('btn-end-turn');
  document.getElementById('btn-language').disabled = isAnimating;
  document.getElementById('btn-tutorial').disabled = isAnimating;
  bossPassiveEl.disabled = isAnimating;
  endBtn.disabled = state.gameOver || isAnimating;
  endBtn.textContent = isEnemyTurn ? translate("对手出牌中...") : translate("结束回合");
  const enemyTurnPreview = document.getElementById('enemy-turn-preview');
  enemyTurnPreview.hidden = state.gameOver || isEnemyTurn;
  enemyTurnPreview.textContent = translate("敌方将出 {0} 张牌", getEnemyCardCount(state));

  const cfg = getAiConfig();
  document.getElementById('ai-mode-text').textContent = cfg.engine === 'llm' && cfg.key ? translate("模型({0})", cfg.model) : translate("对手设置");
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
      translate("止步第 {0} 关", state.stage),
      translate("对手已锁定 {0} 个席位，场上剩余席位已不足 {1} 席，本关夺权失败。", eLocked, BOARD_MAJORITY),
      false,
      translate("重新开始")
    );
    return true;
  }
  return false;
}

function handleStageCleared(pVotes, pLocked = 0) {
  if (state.stage < 3) {
    const boss = getCurrentBoss();
    const nextBoss = state.runBosses[state.stage];
    const score = translate("第 {0} 回合拿下 {1}/9 席，锁定 {2} 席。", state.turn, pVotes, pLocked);
    const winReason = pLocked >= BOARD_MAJORITY ? translate("锁定 {0} 席直接控制董事会", pLocked) : translate("以 {0} / 9 席拿下本关", pVotes);
    const shareText = translate("我在《{0}》第 {1} 关击败了 {2}！{3}", translate(GAME_TITLE), state.stage, boss.name, score);
    showEndModal(
      translate("击败第 {0} 关：{1}", state.stage, boss.name),
      translate("你{0}，按 50% 结余保留资金并获得 $2,500万 战利品补助（保底 $4,500万）。下一关对手：{1}（{2}）。", winReason, nextBoss.name, translate(nextBoss.roleTitle)),
      true,
      translate("进入第 {0} 关", state.stage + 1),
      getGameXShareUrl(shareText)
    );
  } else {
    const elapsed = formatRunTime(stopRunTimer());
    const names = state.runBosses.map(b => b.name).join(' → ');
    const { publicUrl, posterUrl } = getGameShareAddress();
    const shareText = translate("我在《{0}》用时 {1} 连克三关，帮助黄仁勋重返 CEO 宝座！", translate(GAME_TITLE), elapsed);
    showEndModal(
      translate("连克三关，重返 CEO 宝座"),
      translate("你从 0 席起步，连续击败 {0}，重新执掌董事会。", names),
      true,
      translate("再来一局"),
      getXShareUrl([shareText, publicUrl, posterUrl])
    );
  }
}

function getXShareUrl(lines) {
  const intent = new URL('https://twitter.com/intent/tweet');
  intent.searchParams.set('text', lines.filter(Boolean).join('\n'));
  intent.searchParams.set('hashtags', 'BackToCEO');
  return intent.href;
}

function getGameXShareUrl(text, { publicUrl, posterUrl } = getGameShareAddress()) {
  return getXShareUrl([text, publicUrl, translate("支持黄仁勋回归 NVIDIA CEO 职位"), posterUrl]);
}

const supportTemplate = document.getElementById('support-links-template');
const campaignUrl = supportTemplate.content.querySelector('.campaign-site').href;
document.querySelectorAll('[data-support-footer]').forEach(footer => {
  footer.append(supportTemplate.content.cloneNode(true));
});

function renderCampaignShareLinks() {
  const { posterUrl } = getGameShareAddress();
  const shareText = translate("一起转发声援黄仁勋，支持他早日回归 NVIDIA CEO 岗位。");
  const shareUrl = getXShareUrl([campaignUrl, shareText, posterUrl]);
  document.querySelectorAll('.campaign-share').forEach(link => { link.href = shareUrl; });
}

function isPublicShareUrl(url) {
  const host = url.hostname.replace(/\.$/, '');
  return /^https?:$/.test(url.protocol) && host.includes('.') &&
    !/\.(local|localhost)$/.test(host) && !/^(\d+\.){3}\d+$/.test(host);
}

function getGameShareAddress() {
  const canonical = document.querySelector('meta[property="og:url"]').content.trim();
  const pageUrl = new URL(canonical || window.location.href);
  pageUrl.search = '';
  pageUrl.hash = '';
  pageUrl.username = '';
  pageUrl.password = '';

  const isPublic = /^https?:$/.test(pageUrl.protocol) && (Boolean(canonical) || isPublicShareUrl(pageUrl));
  const posterPath = document.getElementById('game-share-poster').getAttribute('src');
  const posterUrl = new URL(posterPath, pageUrl);
  return {
    address: pageUrl.href,
    publicUrl: isPublic ? pageUrl.href : '',
    posterUrl: isPublicShareUrl(posterUrl) ? posterUrl.href : ''
  };
}

function showEndModal(title, desc, isWin = false, btnLabel = translate("🔄 再来一局"), shareUrl = '') {
  state.gameOver = true;
  if (!isWin) stopRunTimer();
  SoundFX.playEnd(isWin);
  renderAll();
  document.getElementById('end-title').textContent = title;
  document.getElementById('end-desc').textContent = desc;
  const completionTime = document.getElementById('end-run-time');
  completionTime.hidden = !isWin || state.stage !== 3;
  if (!completionTime.hidden) renderRunTime('final-run-time', getRunSeconds());
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
  shareLink.hidden = !isWin || !shareUrl;
  if (shareLink.hidden) {
    shareLink.removeAttribute('href');
  } else {
    shareLink.href = shareUrl;
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
    startRunTimer();
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

  startRunTimer();
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
  startRunTimer();
  isAnimating = true;
  state.ap -= 2;
  state.jacketUses -= 1;
  state.powersUsedThisTurn.jacket = true;
  const gained = Math.min(20, 100 - state.influence);
  state.influence += gained;
  const drawn = drawCards(1);
  if (drawn > 0) SoundFX.playDeal(drawn);
  const effects = [];
  if (gained > 0) effects.push(`+${gained}🌟`);
  if (drawn > 0) effects.push(translate("摸{0}牌", drawn));
  renderAll();
  if (!await showCardAnimation({ art: 'assets/card_pr.svg', title: translate("🧥 传说皮衣·厨房直播") }, effects.join(' ') || translate("未触发效果"), false, null)) return;
  isAnimating = false;
  renderAll();
});

document.getElementById('btn-hero-equity').addEventListener('click', async () => {
  if (isAnimating || state.gameOver || state.equityUses <= 0 || state.powersUsedThisTurn.equity || state.ap < 1) return;
  const target = state.seats.find(s => s.owner === 'player' && !s.locked);
  if (!target) return;

  startRunTimer();
  isAnimating = true;
  state.ap -= 1;
  state.equityUses -= 1;
  state.powersUsedThisTurn.equity = true;
  target.locked = true;
  renderAll();
  if (!await showCardAnimation({ art: 'assets/card_banquet.svg', title: translate("📜 1.5% 股权加锁") }, translate("🔒 永久锁住 {0}!", translate(target.name)), false, target.id)) return;
  isAnimating = false;
  if (!checkStageWin()) renderAll();
});

document.getElementById('btn-hero-rally').addEventListener('click', async () => {
  if (isAnimating || state.gameOver || state.rallyUses <= 0 || state.powersUsedThisTurn.rally || state.influence < 15) return;
  const seat = claimNeutralSeat(state) || stealEnemySeat(state);
  if (!seat) return;

  startRunTimer();
  isAnimating = true;
  state.rallyUses -= 1;
  state.powersUsedThisTurn.rally = true;
  state.influence -= 15;
  renderAll();
  if (!await showCardAnimation({ art: 'assets/card_pr.svg', title: translate("📣 舆论号召") }, translate("消耗15🌟 抢占{0}!", translate(seat.name)), false, seat.id)) return;
  isAnimating = false;
  if (!checkStageWin()) renderAll();
});

document.getElementById('btn-end-turn').addEventListener('click', async () => {
  if (isAnimating || state.gameOver) return;
  startRunTimer();
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
      state.enemyTaunt = translate("“可恶……700人联名信压下了我的额外行动！”");
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
        showEndModal(translate("止步第 {0} 关", state.stage), translate("{0} 回合结束，你仅获得 {1} 席（未满 {2} 席），未能击败 {3}。", state.maxTurns, pVotes, BOARD_MAJORITY, boss.name), false, translate("重新开始"));
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
    console.error(translate("结束回合执行出错:"), err);
  } finally {
    if (state === turnState) {
      isEnemyTurn = false;
      isAnimating = false;
      renderAll();
    }
  }
});

const soundButton = document.getElementById('btn-sound-toggle');
function renderSoundButton() {
  soundButton.textContent = SoundFX.isMuted() ? translate("🔇 静音") : translate("🔊 音效开");
}
soundButton.addEventListener('click', () => {
  SoundFX.toggleMute();
  renderSoundButton();
});

document.getElementById('btn-restart').addEventListener('click', () => {
  initGame();
  SoundFX.playDeal(4);
});

const posterShareButton = document.getElementById('btn-share-poster');
const posterShareStatus = document.getElementById('poster-share-status');
let posterShareData;

document.getElementById('btn-share-game').addEventListener('click', async () => {
  const shareAddress = getGameShareAddress();
  const { address, publicUrl } = shareAddress;
  const shareTitle = translate(GAME_TITLE);
  document.getElementById('game-share-url-label').textContent = publicUrl ? translate("分享链接") : translate("当前地址");
  document.getElementById('game-share-url').value = address;
  document.getElementById('game-share-local-hint').hidden = Boolean(publicUrl);
  const shareLink = document.getElementById('game-share-x');
  const shareUrl = getGameXShareUrl(shareTitle, shareAddress);
  shareLink.href = shareUrl;
  shareLink.textContent = publicUrl ? translate("分享到 X") : translate("测试 X 发帖");
  posterShareButton.hidden = true;
  posterShareStatus.hidden = true;
  const dialog = document.getElementById('game-share-dialog');
  dialog.showModal();

  if (!publicUrl || !window.isSecureContext || !navigator.share || !navigator.canShare) return;
  try {
    const poster = document.getElementById('game-share-poster');
    const response = await fetch(poster.src);
    if (!response.ok) return;
    const file = new File([await response.blob()], 'back-to-ceo-poster.jpg', { type: 'image/jpeg' });
    const data = { title: shareTitle, text: shareTitle, url: publicUrl, files: [file] };
    if (dialog.open && shareLink.href === shareUrl && navigator.canShare(data)) {
      posterShareData = data;
      posterShareButton.hidden = false;
    }
  } catch {
    // 下载与 X 分享入口在文件分享不可用时仍可使用。
  }
});

posterShareButton.addEventListener('click', async () => {
  posterShareStatus.hidden = true;
  try {
    await navigator.share(posterShareData);
  } catch (error) {
    posterShareStatus.hidden = error.name === 'AbortError';
  }
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

const TUTORIAL_SEEN_KEY = 'backtoceo_tutorial_seen';
let tutorialSeen = false;
try {
  tutorialSeen = localStorage.getItem(TUTORIAL_SEEN_KEY) === '1';
} catch {
  // 存储不可用时，在当前页面记住教学状态。
}

const tutorialButton = document.getElementById('btn-tutorial');
const tutorialDialog = document.getElementById('tutorial-dialog');
const tutorialBody = tutorialDialog.querySelector('.modal-body');
const tutorialPanels = [...tutorialDialog.querySelectorAll('.tutorial-step')];
const tutorialBack = document.getElementById('tutorial-back');
const tutorialNext = document.getElementById('tutorial-next');
const opponentStep = tutorialPanels.length - 1;
let tutorialStep = 0;

function showTutorialStep(step) {
  tutorialStep = step;
  tutorialPanels.forEach((panel, index) => { panel.hidden = index !== step; });
  document.getElementById('tutorial-progress').textContent = translate("第 {0} / {1} 步", step + 1, tutorialPanels.length);
  tutorialBack.hidden = step === 0;
  tutorialNext.textContent = translate(step === opponentStep ? "返回牌桌" : "下一步");
  tutorialBody.scrollTop = 0;
  tutorialPanels[step].querySelector('h3').focus({ preventScroll: true });
}

function openTutorial(step = 0) {
  document.getElementById('tutorial-instant-win').textContent = translate("即时胜利：第 1 关占 {0} 席，第 2、3 关分别占 {1}、{2} 席。", ...INSTANT_WIN_SEATS);
  document.getElementById('tutorial-lock-win').textContent = translate("任一关锁定 {0} 个我方席位即胜。对手先锁定 {0} 席，你立即落败。", BOARD_MAJORITY);
  document.getElementById('tutorial-round-win').textContent = translate("若未提前分出胜负，第 {0} 回合对手行动结束后，仍持有至少 {1} 席才算过关。", state.maxTurns, BOARD_MAJORITY);
  document.getElementById('tutorial-enemy-turn').textContent = translate("点结束回合后，对手通常出与你本回合相同数量的牌，至少 {0} 张。它们可以抢席、动摇未锁席位或扣除资源。出牌后，对手结算回合末被动。打出「700人联名逼宫」能让对手只出 {0} 张牌并跳过这次被动。", MIN_ENEMY_CARDS);

  const boss = getCurrentBoss();
  document.getElementById('tutorial-boss-portrait').src = portraitSrc(boss.portrait);
  document.getElementById('tutorial-boss-name').textContent = `${boss.name} · ${translate(boss.roleTitle)}`;
  document.getElementById('tutorial-boss-passive').textContent = translate("被动：{0}", translate(boss.passiveName));
  document.getElementById('tutorial-boss-effect').textContent = translate(boss.passiveDesc);

  tutorialDialog.showModal();
  showTutorialStep(step);
}

tutorialButton.addEventListener('click', () => openTutorial());
document.getElementById('boss-passive').addEventListener('click', () => openTutorial(opponentStep));
tutorialBack.addEventListener('click', () => showTutorialStep(tutorialStep - 1));
tutorialNext.addEventListener('click', () => {
  if (tutorialStep === opponentStep) tutorialDialog.close();
  else showTutorialStep(tutorialStep + 1);
});
tutorialDialog.addEventListener('close', () => {
  if (!tutorialSeen) {
    tutorialSeen = true;
    try {
      localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
    } catch {
      // 存储不可用时仍可关闭教学。
    }
  }
  if (document.activeElement === document.body) tutorialButton.focus({ preventScroll: true });
});

const languageDialog = document.getElementById('language-dialog');
document.getElementById('btn-language').addEventListener('click', () => languageDialog.showModal());
languageDialog.addEventListener('cancel', event => {
  if (!selectedLanguage) event.preventDefault();
});
document.querySelectorAll('[data-game-language]').forEach(button => {
  button.addEventListener('click', () => {
    const language = button.dataset.gameLanguage;
    if (language !== getGameLanguage()) state.enemyTaunt = getCurrentBoss().tauntStart;
    setGameLanguage(language);
    renderCampaignShareLinks();
    renderSoundButton();
    clearStage();
    renderAll();
    languageDialog.close();
    if (!tutorialSeen) openTutorial();
  });
});

applyPageLanguage();
renderCampaignShareLinks();
renderSoundButton();
initGame();
if (!selectedLanguage) languageDialog.showModal();
else if (!tutorialSeen) openTutorial();
