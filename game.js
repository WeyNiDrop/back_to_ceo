import {
  BOARD_MAJORITY, CARD_ANIMATION_MS, CARD_DB, countLockedEnemySeats, createGameRules,
  getPlayerScore, INSTANT_WIN_SEATS, isInstantWin,
  MIN_ENEMY_CARDS, normalizePlayerName, PASSIVE_ANIMATION_MS, seededRandom,
} from './game-rules.mjs?v=20261118-leaderboard';

const rules = createGameRules({ translate, formatCash });
let rankedRun = null;

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
  return rules.getCurrentBoss(state);
}

function getStageGoalText() {
  const instantSeats = INSTANT_WIN_SEATS[state.stage - 1];
  return translate("占 {0} 席或锁 {1} 席即胜（第 {2} 回合末 ≥{3} 席晋级）", instantSeats, BOARD_MAJORITY, state.maxTurns, BOARD_MAJORITY);
}

function portraitSrc(portrait) {
  return `assets/portraits/${portrait}.jpg`;
}

function getEffectiveCosts(item) {
  return rules.getEffectiveCosts(state, item);
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

function startStage(stageNum, keepResources = false, random) {
  if (!keepResources) resetRunTimer();
  state = rules.makeStage(stageNum, keepResources ? state : null, random);
  isAnimating = false;
  isEnemyTurn = false;
  isDiscardMode = false;
  clearStage();
  renderAll();
}

function initGame() {
  rankedRun = null;
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
  await sleep(CARD_ANIMATION_MS);
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

  const cfg = getAiConfig();
  document.getElementById('ai-mode-text').textContent = cfg.engine === 'llm' && cfg.key ? translate("模型({0})", cfg.model) : translate("对手设置");
  document.getElementById('btn-ai-config').disabled = Boolean(rankedRun);
  document.getElementById('ranked-run-label').hidden = !rankedRun;
}

function checkStageWin() {
  const score = getPlayerScore(state);
  if (isInstantWin(state.stage, score)) {
    handleStageCleared(score.votes, score.locked);
    return true;
  }
  return false;
}

function checkStageDefeat() {
  const eLocked = countLockedEnemySeats(state);
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
    showEndModal(
      translate("连克三关，重返 CEO 宝座"),
      translate("你从 0 席起步，连续击败 {0}，重新执掌董事会。", names),
      true,
      translate("再来一局"),
      getFinalShareUrl(elapsed)
    );
    if (rankedRun) void submitRankedRun(rankedRun, state);
  }
}

function getFinalShareUrl(elapsed) {
  const { publicUrl, posterUrl } = getGameShareAddress();
  const shareText = translate("我在《{0}》用时 {1} 连克三关，帮助黄仁勋重返 CEO 宝座！", translate(GAME_TITLE), elapsed);
  return getXShareUrl([shareText, publicUrl, posterUrl]);
}

function getXShareUrl(lines) {
  const intent = new URL('https://x.com/intent/tweet');
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
  document.getElementById('end-defeat-message').hidden = isWin;
  const completionTime = document.getElementById('end-run-time');
  document.getElementById('end-ranked-status').textContent = '';
  retryRankedButton.hidden = true;
  retryRankedButton.onclick = null;
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
    if (!rules.discardCard(state, idx)) return;
    recordAction('discard', idx);
    isDiscardMode = false;
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

  const res = rules.playCard(state, idx);
  if (!res) return;
  recordAction('card', idx);
  isAnimating = true;
  if (res.gainedAp > 0) SoundFX.playManaRefresh();
  if (res.drawn > 0) SoundFX.playDeal(res.drawn);
  renderAll();
  if (!await showCardAnimation(tpl, res.effect, false, res.targetSeatId)) return;

  isAnimating = false;
  if (!checkStageWin()) renderAll();
});

document.getElementById('btn-hero-jacket').addEventListener('click', async () => {
  if (isAnimating || state.gameOver) return;
  const move = rules.useJacket(state);
  if (!move) return;
  recordAction('jacket');
  isAnimating = true;
  const { drawn, gained } = move;
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
  if (isAnimating || state.gameOver) return;
  const target = rules.useEquity(state);
  if (!target) return;
  recordAction('equity');
  isAnimating = true;
  renderAll();
  if (!await showCardAnimation({ art: 'assets/card_banquet.svg', title: translate("📜 1.5% 股权加锁") }, translate("🔒 永久锁住 {0}!", translate(target.name)), false, target.id)) return;
  isAnimating = false;
  if (!checkStageWin()) renderAll();
});

document.getElementById('btn-hero-rally').addEventListener('click', async () => {
  if (isAnimating || state.gameOver) return;
  const seat = rules.useRally(state);
  if (!seat) return;
  recordAction('rally');
  isAnimating = true;
  renderAll();
  if (!await showCardAnimation({ art: 'assets/card_pr.svg', title: translate("📣 舆论号召") }, translate("消耗15🌟 抢占{0}!", translate(seat.name)), false, seat.id)) return;
  isAnimating = false;
  if (!checkStageWin()) renderAll();
});

document.getElementById('btn-end-turn').addEventListener('click', async () => {
  if (isAnimating || state.gameOver) return;
  recordAction('end');
  const turnState = state;
  isAnimating = true;
  isEnemyTurn = true;
  renderAll();

  try {
    const boss = getCurrentBoss();
    const cfg = getAiConfig();
    const turn = rules.beginEnemyTurn(state);

    for (let i = 0; i < turn.cards; i++) {
      const excluded = rules.enemyExclusions(turn);
      const aiRes = !rankedRun && cfg.engine === 'llm' && cfg.key
        ? await runLlmAi(state, cfg, excluded, boss, rules)
        : rules.runBuiltinAi(state, excluded);
      if (state !== turnState) return;

      const outcome = rules.playEnemyCard(state, turn, aiRes);
      renderAll();
      if (!await showCardAnimation(aiRes.card, outcome.floatText, true, outcome.targetSeatId)) return;
      if (checkStageDefeat()) return;
    }

    const passive = rules.playEnemyPassive(state, turn);
    if (passive) {
      renderAll();
      renderSeats(passive.targetSeatId);
      await sleep(PASSIVE_ANIMATION_MS);
      if (state !== turnState) return;
      if (checkStageDefeat()) return;
    }

    if (state.turn >= state.maxTurns) {
      const { votes: pVotes, locked: pLocked } = getPlayerScore(state);
      isEnemyTurn = false;
      isAnimating = false;
      if (pVotes >= BOARD_MAJORITY) {
        handleStageCleared(pVotes, pLocked);
      } else {
        showEndModal(translate("止步第 {0} 关", state.stage), translate("{0} 回合结束，你仅获得 {1} 席（未满 {2} 席），未能击败 {3}。", state.maxTurns, pVotes, BOARD_MAJORITY, boss.name), false, translate("重新开始"));
      }
      return;
    }

    rules.nextTurn(state);
    isDiscardMode = false;
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
  if (keep) startStage(nextStage, true);
  else initGame();
  SoundFX.playDeal(4);
});

const modalAi = document.getElementById('modal-ai');
document.getElementById('btn-ai-config').addEventListener('click', () => {
  const cfg = getAiConfig();
  document.querySelector(`input[name="ai-engine"][value="${cfg.engine}"]`).checked = true;
  document.getElementById('llm-url').value = cfg.url || 'https://api.openai.com/v1/chat/completions';
  document.getElementById('llm-model').value = cfg.model || 'gpt-4o-mini';
  document.getElementById('llm-key').value = cfg.key || '';
  document.getElementById('llm-settings').style.display = cfg.engine === 'llm' ? 'flex' : 'none';
  modalAi.style.display = 'flex';
});
document.getElementById('btn-close-ai').addEventListener('click', () => (modalAi.style.display = 'none'));
document.querySelectorAll('input[name="ai-engine"]').forEach(r => {
  r.addEventListener('change', e => {
    document.getElementById('llm-settings').style.display = e.target.value === 'llm' ? 'flex' : 'none';
  });
});
document.getElementById('btn-save-ai').addEventListener('click', () => {
  const engine = document.querySelector('input[name="ai-engine"]:checked').value;
  saveAiConfig({
    engine,
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

const PLAYER_NAME_KEY = 'backtoceo_player_name';
const RANDOM_PLAYER_NAMES = ['夜市股东 {0}', '芯片猎手 {0}', '皮衣策士 {0}', '董事会新秀 {0}'];
const playerNameDialog = document.getElementById('player-name-dialog');
const playerNameInput = document.getElementById('player-name-input');
const playerNameDisplay = document.getElementById('player-name-display');
const cancelPlayerName = document.getElementById('btn-cancel-player-name');
let playerName = '';

try {
  playerName = normalizePlayerName(localStorage.getItem(PLAYER_NAME_KEY) || '');
} catch {
  // 存储不可用时，在当前页面记住名称。
}

function renderPlayerName() {
  playerNameDisplay.textContent = playerName;
  playerNameDisplay.hidden = !playerName;
}

function openPlayerName() {
  playerNameInput.value = playerName;
  playerNameInput.setCustomValidity('');
  cancelPlayerName.hidden = !playerName;
  playerNameDialog.showModal();
}

function continueFirstVisit() {
  if (!playerName) openPlayerName();
  else if (!tutorialSeen) openTutorial();
}

document.getElementById('btn-player-name').addEventListener('click', openPlayerName);
cancelPlayerName.addEventListener('click', () => playerNameDialog.close());
playerNameDialog.addEventListener('cancel', event => {
  if (!playerName) event.preventDefault();
});
playerNameInput.addEventListener('input', () => playerNameInput.setCustomValidity(''));
document.getElementById('btn-random-player-name').addEventListener('click', () => {
  const template = RANDOM_PLAYER_NAMES[Math.floor(Math.random() * RANDOM_PLAYER_NAMES.length)];
  playerNameInput.value = translate(template, Math.floor(Math.random() * 9000) + 1000);
  playerNameInput.setCustomValidity('');
});
document.getElementById('player-name-form').addEventListener('submit', event => {
  event.preventDefault();
  const name = normalizePlayerName(playerNameInput.value);
  if (!name) {
    playerNameInput.setCustomValidity(translate("请输入 1 到 24 个字符的有效名称。"));
    playerNameInput.reportValidity();
    return;
  }
  const firstName = !playerName;
  playerName = name;
  try {
    localStorage.setItem(PLAYER_NAME_KEY, playerName);
  } catch {
    // 存储不可用时，名称在当前页面仍然可用。
  }
  renderPlayerName();
  playerNameDialog.close();
  if (firstName) continueFirstVisit();
});

const leaderboardDialog = document.getElementById('leaderboard-dialog');
const leaderboardStatus = document.getElementById('leaderboard-status');
const leaderboardEntries = document.getElementById('leaderboard-entries');
const rankedStartStatus = document.getElementById('ranked-start-status');
const startRankedButton = document.getElementById('btn-start-ranked');
const retryRankedButton = document.getElementById('btn-retry-ranked');
let rankedAvailable = false;
let startingRanked = false;

function recordAction(type, index) {
  startRunTimer();
  rankedRun?.actions.push(index === undefined ? [type] : [type, index]);
}

function leaderboardRequest(data) {
  const options = { cache: 'no-store', signal: AbortSignal.timeout(12000) };
  if (data) {
    options.method = 'POST';
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(data);
  }
  return fetch('/api/leaderboard', options);
}

function displayLeaderboard({ entries, cleared, rankedAvailable: available }) {
  leaderboardStatus.textContent = translate("独立通关玩家：{0}", cleared);
  if (entries.length === 0) {
    leaderboardStatus.textContent += ' · ' + translate("暂无通关成绩。");
  }
  const rows = entries.map(entry => {
    const item = document.createElement('li');
    const row = document.createElement('div');
    row.className = 'leaderboard-entry';
    const nickname = document.createElement('bdi');
    nickname.textContent = entry.nickname;
    const seconds = Math.floor(entry.elapsedMs / 1000);
    const time = document.createElement('time');
    time.textContent = formatRunTime(seconds);
    time.dateTime = 'PT' + seconds + 'S';
    row.append(nickname, time);
    item.append(row);
    return item;
  });
  leaderboardEntries.replaceChildren(...rows);
  leaderboardEntries.hidden = rows.length === 0;
  rankedAvailable = available;
  startRankedButton.disabled = startingRanked || !rankedAvailable;
  if (!available) rankedStartStatus.textContent = translate("暂时无法启动排位挑战。");
}

document.getElementById('btn-leaderboard').addEventListener('click', async () => {
  leaderboardDialog.showModal();
  leaderboardEntries.hidden = true;
  rankedStartStatus.textContent = '';
  startRankedButton.disabled = true;
  rankedAvailable = false;
  leaderboardStatus.textContent = translate("正在加载排行榜…");
  try {
    const response = await leaderboardRequest();
    if (!response.ok) throw new Error('Leaderboard unavailable');
    displayLeaderboard(await response.json());
  } catch {
    leaderboardStatus.textContent = translate("排行榜暂时无法加载。");
  }
});

startRankedButton.addEventListener('click', async () => {
  if (startingRanked || !rankedAvailable || !playerName) return;
  startingRanked = true;
  startRankedButton.disabled = true;
  rankedStartStatus.textContent = translate("正在启动排位挑战…");
  try {
    const response = await leaderboardRequest({ type: 'start' });
    if (!response.ok) throw new Error('Ranked run unavailable');
    const { token, seed } = await response.json();
    if (!leaderboardDialog.open) return;
    rankedRun = { token, actions: [] };
    startStage(1, false, seededRandom(seed));
    startRunTimer();
    SoundFX.playDeal(4);
    leaderboardDialog.close();
  } catch {
    rankedStartStatus.textContent = translate("暂时无法启动排位挑战。");
  } finally {
    startingRanked = false;
    startRankedButton.disabled = !rankedAvailable;
  }
});

async function submitRankedRun(run, finishedState) {
  const status = document.getElementById('end-ranked-status');
  run.nickname ??= playerName;
  retryRankedButton.hidden = true;
  status.textContent = translate("正在保存排位成绩…");
  try {
    const response = await leaderboardRequest({
      type: 'finish', token: run.token, nickname: run.nickname, actions: run.actions,
    });
    if (state !== finishedState) return;
    if (response.status === 400) {
      status.textContent = translate("本次成绩未通过验证。");
      return;
    }
    if (!response.ok) throw new Error('Ranked time unavailable');
    const { elapsedMs } = await response.json();
    if (state !== finishedState) return;
    runFinishedSeconds = Math.floor(elapsedMs / 1000);
    updateRunTimer();
    renderRunTime('final-run-time', runFinishedSeconds);
    document.getElementById('btn-share-x').href = getFinalShareUrl(formatRunTime(runFinishedSeconds));
    status.textContent = translate("已提交排位成绩。");
  } catch {
    if (state !== finishedState) return;
    status.textContent = translate("暂时无法保存成绩。");
    retryRankedButton.onclick = () => void submitRankedRun(run, finishedState);
    retryRankedButton.hidden = false;
  }
}

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
    continueFirstVisit();
  });
});

applyPageLanguage();
renderCampaignShareLinks();
renderSoundButton();
initGame();
renderPlayerName();
if (!selectedLanguage) languageDialog.showModal();
else continueFirstVisit();
