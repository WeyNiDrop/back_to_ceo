// Shared by the browser and the Pages Function that verifies ranked runs.
export const MIN_ENEMY_CARDS = 2;
export const INSTANT_WIN_SEATS = [6, 7, 7];
export const BOARD_MAJORITY = 5;
export const CARD_ANIMATION_MS = 900;
export const PASSIVE_ANIMATION_MS = 650;
export const MAX_RUN_ACTIONS = 400;

export function normalizePlayerName(value) {
  const name = value.trim().normalize('NFC');
  return [...name].length <= 24 && !/[\u0000-\u001f\u007f-\u009f]/.test(name) ? name : '';
}

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
  { name: '涉外安全审查', categories: ['spy'], desc: '打出后 -8🌟', isNeg: true, mod: { infPenalty: 8 } },
  { name: '酒店录像传闻', categories: ['spy', 'influence'], desc: '体力消耗 +1💎', isNeg: true, mod: { apPenalty: 1 } },
  { name: '开支预算争议', categories: ['stamina', 'politics'], desc: '额外 -$500万', isNeg: true, mod: { cashPenalty: 500 } },
  { name: '国会闭门问询', categories: ['politics'], desc: '需影响力 ≥20🌟', isNeg: true, mod: { infReqPenalty: 20 } },
  { name: '芯片出口调查', categories: ['spy', 'politics'], desc: '律师费 +$400万', isNeg: true, mod: { cashPenalty: 400 } },
  { name: '微波炉蒸鱼未加盖', categories: ['stamina'], desc: '打出后 -5🌟', isNeg: true, mod: { infPenalty: 5 } },
  { name: '疑似强迫员工吃牛腩', categories: ['stamina'], desc: '打出后 -5🌟', isNeg: true, mod: { infPenalty: 5 } },
  { name: '团队沟通失当', categories: ['influence', 'spy'], desc: '体力 +1💎 且打出后 -6🌟', isNeg: true, mod: { apPenalty: 1, infPenalty: 6 } },
  { name: '董事会问责', categories: ['politics'], desc: '需 ≥25🌟 且额外 -$400万', isNeg: true, mod: { infReqPenalty: 25, cashPenalty: 400 } }
];

// 19张统一4大类卡牌库（支持 apCost / cashCost / infCost 消耗）
export const CARD_DB = {
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

export function createGameRules({ translate = text => text, formatCash = String } = {}) {
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
      passiveDesc: '回合结束时，若你的影响力低于 35 且有未锁定席位，使你的 1 席变为中立。其他情况扣除 6🌟。',
      tauntStart: '“热搜榜已经全是我买的通稿，你拿什么翻盘？”',
      onTurnEnd(state) {
        if (state.influence < 35) {
          const pSeat = state.seats.find(s => s.owner === 'player' && !s.locked);
          if (pSeat) {
            pSeat.owner = 'neutral';
            return { text: translate("舆论绞肉机：影响力不足 35，{0} 动摇中立", translate(pSeat.name)), targetSeatId: pSeat.id };
          }
        }
        const loss = Math.min(state.influence, 6);
        state.influence -= loss;
        return { text: translate("舆论绞肉机：扣除 {0} 🌟影响力", loss) };
      }
    },
    {
      id: 'cole_pol',
      portrait: 'boss-cole',
      name: 'Senator Cole',
      roleTitle: '铁腕政客',
      passiveName: '合规铁幕',
      passiveDesc: '你的间谍牌和政治牌多花 $200万。回合结束时锁定自己的 1 席，无席可锁则扣你 $400万。第 3 关首回合只预告。',
      tauntStart: '“这里归华盛顿管！每一张牌都要过我的合规审查。”',
      onTurnEnd(state) {
        if (state.stage === 3 && state.turn === 1) {
          return { text: translate("合规铁幕：下回合起锁定敌方席位") };
        }
        const unlockEnemy = state.seats.find(s => s.owner === 'enemy' && !s.locked && !s.isCore);
        if (unlockEnemy) {
          unlockEnemy.locked = true;
          return { text: translate("合规铁幕：锁定敌席 {0}", translate(unlockEnemy.name)), targetSeatId: unlockEnemy.id };
        }
        const loss = Math.min(state.cash, 400);
        state.cash -= loss;
        return { text: translate("合规铁幕：征收合规罚款 {0}", formatCash(loss)) };
      }
    },
    {
      id: 'marcus_ceo',
      portrait: 'boss-marcus',
      name: 'Marcus Vance',
      roleTitle: '篡位代理CEO',
      passiveName: '算力霸权',
      passiveDesc: '回合结束时优先抢 1 个中立席。无中立席且你至少有 3 席时，尝试夺取你的 1 个未锁定席。无席可抢则扣除 10🌟。',
      tauntStart: '“公司现在姓 Vance，你只是个被除名的过客。”',
      onTurnEnd(state) {
        const pVotes = state.seats.filter(s => s.owner === 'player').length;
        const target = state.seats.find(s => s.owner === 'neutral') || (pVotes >= 3 ? state.seats.find(s => s.owner === 'player' && !s.locked) : null);
        if (target) {
          target.owner = 'enemy';
          return { text: translate("算力霸权：吞并了 {0}", translate(target.name)), targetSeatId: target.id };
        }
        const loss = Math.min(state.influence, 10);
        state.influence -= loss;
        return { text: translate("算力霸权：全网封锁，扣除 {0} 🌟影响力", loss) };
      }
    },
    {
      id: 'victor_wolf',
      portrait: 'boss-victor',
      name: 'Victor Thorne',
      roleTitle: '华尔街做空之狼',
      passiveName: '恶意做空',
      passiveDesc: '回合结束时扣除你 $500万。若扣款后资金低于 $1,500万，额外抢 1 个中立席。',
      tauntStart: '“我已经做空了你的个人信用，看看你的现金还能撑几轮。”',
      onTurnEnd(state) {
        const loss = Math.min(state.cash, 500);
        state.cash -= loss;
        if (state.cash < 1500) {
          const n = state.seats.find(s => s.owner === 'neutral');
          if (n) {
            n.owner = 'enemy';
            return { text: translate("恶意做空：扣除 {0} 并抢走 {1}", formatCash(loss), translate(n.name)), targetSeatId: n.id };
          }
        }
        return { text: translate("恶意做空：资金 -{0}", formatCash(loss)) };
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
            return { text: translate("安全红线：触发审查，扣 8🌟 并锁定 {0}", translate(e.name)), targetSeatId: e.id };
          }
          return { text: translate("安全红线：触发安全审查，扣除 8 🌟影响力") };
        }
        return { text: translate("安全红线：手牌数量合规，本回合未触发审查") };
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
        if (pSeat && state.random() < 0.6) {
          pSeat.owner = 'neutral';
          return { text: translate("桃色幽灵：爆料新照片，{0} 动摇中立", translate(pSeat.name)), targetSeatId: pSeat.id };
        }
        const loss = Math.min(state.cash, 400);
        state.cash -= loss;
        return { text: translate("桃色幽灵：支付 {0} 封口费", formatCash(loss)) };
      }
    },
    {
      id: 'arthur_old',
      portrait: 'boss-arthur',
      name: 'Arthur Pendelton',
      roleTitle: '元老守旧派领袖',
      passiveName: '祖宗之法',
      passiveDesc: '回合结束时，若你至少有 3 席，尝试夺取你的 1 个未锁定席。无席可抢或条件未满足时扣除 5🌟。',
      tauntStart: '“公司不需要穿皮衣的摇滚明星，董事会的规矩不能破！”',
      onTurnEnd(state) {
        const pCount = state.seats.filter(s => s.owner === 'player').length;
        if (pCount >= 3) {
          const pSeat = state.seats.find(s => s.owner === 'player' && !s.locked);
          if (pSeat) {
            pSeat.owner = 'enemy';
            return { text: translate("祖宗之法：元老反扑，抢回 {0}", translate(pSeat.name)), targetSeatId: pSeat.id };
          }
        }
        const loss = Math.min(state.influence, 5);
        state.influence -= loss;
        return { text: translate("祖宗之法：元老发表公开信，影响力 -{0}🌟", loss) };
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
          return { text: translate("晶圆断供：以产能要挟，拉拢了 {0}", translate(n.name)), targetSeatId: n.id };
        }
        return { text: translate("晶圆断供：供应链全面收紧") };
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
            return { text: translate("天眼审计：资金不足扣 {0} 且 {1} 动摇", formatCash(loss), translate(pSeat.name)), targetSeatId: pSeat.id };
          }
        }
        return { text: translate("天眼审计：冻结并扣除 {0} 调查保证金", formatCash(loss)) };
      }
    },
    {
      id: 'baron_fund',
      portrait: 'boss-al-mansoor',
      name: 'Baron Al-Mansoor',
      roleTitle: '中东主权巨鳄',
      passiveName: '钞能力碾压',
      passiveDesc: '回合结束时，若你的资金低于 $4,500万且有中立席，买下 1 个中立席。其他情况扣除 7🌟。',
      tauntStart: '“在绝对的主权基金面前，你的3%股权不过是个零头。”',
      onTurnEnd(state) {
        if (state.cash < 4500) {
          const n = state.seats.find(s => s.owner === 'neutral');
          if (n) {
            n.owner = 'enemy';
            return { text: translate("钞能力碾压：砸钱买下 {0}", translate(n.name)), targetSeatId: n.id };
          }
        }
        const loss = Math.min(state.influence, 7);
        state.influence -= loss;
        return { text: translate("钞能力碾压：资本压制，影响力 -{0}🌟", loss) };
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
            return { text: translate("价格战倾销：扣 8🌟 并抢走 {0}", translate(n.name)), targetSeatId: n.id };
          }
        }
        return { text: translate("价格战倾销：影响力 -8🌟") };
      }
    }
  ];

  function pickRunBosses(random, count = 3) {
    const pool = [...AI_BOSS_POOL];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
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
        floatParts.push(translate("敌方+1席"));
      }
    }

    if (fx.claimNeutralOrSteal) {
      const pSeats = state.seats.filter(s => s.owner === 'player' && !s.locked);
      const neutrals = state.seats.filter(s => s.owner === 'neutral');
      const pool = pSeats.length > 0 && state.random() < 0.55 ? pSeats : (neutrals.length > 0 ? neutrals : pSeats);
      if (pool.length > 0) {
        const t = pool[Math.floor(state.random() * pool.length)];
        t.owner = 'enemy';
        targetSeatId = t.id;
        floatParts.push(translate("敌方夺1席!"));
      }
    }

    if (fx.demotePlayer) {
      const pSeats = state.seats.filter(s => s.owner === 'player' && !s.locked);
      if (pSeats.length > 0) {
        const t = pSeats[Math.floor(state.random() * pSeats.length)];
        t.owner = 'neutral';
        targetSeatId = t.id;
        floatParts.push(translate("席位动摇!"));
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
      if (loss > 0) floatParts.push(translate("-{0}", formatCash(loss)));
    }

    return {
      targetSeatId,
      floatText: floatParts.join(' · ') || translate("稳固防线")
    };
  }

  function getAiCardPool(state, excludedCardIds = new Set()) {
    const available = AI_CARDS.filter(card => !excludedCardIds.has(card.id));
    const valid = available.filter(card => card.canHit(state));
    return valid.length > 0 ? valid : available;
  }

  function runBuiltinAi(state, excludedCardIds) {
    const pool = getAiCardPool(state, excludedCardIds);
    const pCount = state.seats.filter(s => s.owner === 'player' && !s.locked).length;
    const find = id => pool.find(c => c.id === id);
    let chosen = null;

    const scandal = find('ai_scandal');
    const bribe = find('ai_bribe');
    if (pCount >= 2 && scandal && state.random() < 0.65) chosen = scandal;
    else if (bribe && state.random() < 0.6) chosen = bribe;
    else if (state.cash >= 2200) chosen = find('ai_sec');

    if (!chosen) chosen = pool[Math.floor(state.random() * pool.length)];
    return { card: chosen, taunt: chosen.taunt, source: 'builtin' };
  }

  function getCurrentBoss(state) {
    return (state.runBosses && state.runBosses[state.stage - 1]) || AI_BOSS_POOL[0];
  }

  function getEnemyCardCount(turnState) {
    if (turnState.aiFrozen) return MIN_ENEMY_CARDS;
    return Math.max(MIN_ENEMY_CARDS, turnState.cardsPlayedThisTurn - turnState.aiPenalty);
  }

  function getEffectiveCosts(state, item) {
    const c = CARD_DB[item.key];
    const boss = getCurrentBoss(state);
    let ap = Math.max(0, c.apCost - (item.affix?.mod?.apDiscount || 0) + (item.affix?.mod?.apPenalty || 0));
    let cash = c.cashCost + (item.affix?.mod?.cashPenalty || 0);
    let inf = c.infCost || 0;
    let infReq = item.affix?.mod?.infReqPenalty || 0;
    if (boss.id === 'cole_pol' && (c.category === 'spy' || c.category === 'politics')) cash += 200;
    if (boss.id === 'sophia_supply' && c.category === 'stamina') cash += 200;
    if (boss.id === 'miller_sec' && cash > 0) cash += 100;
    return { ap, cash, inf, infReq };
  }

  function executeCardEffects(item, s) {
    const card = CARD_DB[item.key];
    const fx = card.effects || {};
    const mod = item.affix?.mod || {};
    const toastParts = [];
    let lastSeat = null;
    let drawn = 0;

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
      drawn = drawCards(s, totalDraw);
      if (drawn > 0) {
        toastParts.push(translate("摸{0}牌", drawn));
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
      targetSeatId: lastSeat?.id,
      drawn,
      gainedAp
    };
  }

  function shuffle(arr, random) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
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

  function rollAffixForStance(stanceId, card, random) {
    const r = random();
    if (r < 0.25) {
      if (card?.allowNegativeAffix === false) return null;
      const pool = card ? NEGATIVE_AFFIXES.filter(affix => affix.categories.includes(card.category)) : NEGATIVE_AFFIXES;
      return pool[Math.floor(random() * pool.length)] ?? null;
    }
    if (r < 0.75) {
      let pool = STANCES[stanceId]?.affixes || STANCES.geek.affixes;
      if (card && card.apCost === 0) {
        pool = pool.filter(a => !a.mod?.apDiscount);
      }
      return pool[Math.floor(random() * pool.length)];
    }
    return null;
  }

  function drawCards(state, count) {
    const handSize = state.hand.length;
    for (let i = 0; i < count; i++) {
      if (state.hand.length >= 5) break;
      if (state.deck.length === 0) {
        if (state.discard.length === 0) break;
        state.deck = shuffle(state.discard, state.random);
        state.discard = [];
      }
      const key = state.deck.pop();
      state.hand.push({
        uid: `${key}_${state.random().toString(36).slice(2, 7)}`,
        key,
        affix: rollAffixForStance(state.stance, CARD_DB[key], state.random)
      });
    }
    return state.hand.length - handSize;
  }

  function makeStage(stageNum, previous, random = previous?.random ?? Math.random) {
    const runBosses = previous?.runBosses ?? pickRunBosses(random);
    const boss = runBosses[stageNum - 1];
    const baseEnemyCount = stageNum === 1 && boss.id !== 'baron_fund' ? 3 : 4;
    const extraLocks = (stageNum === 3 || boss.id === 'arthur_old') ? [7] : [];

    const state = {
      stage: stageNum,
      random,
      runBosses,
      stance: previous?.stance ?? 'geek',
      turn: 1,
      maxTurns: 6,
      ap: 4,
      maxAp: 4,
      cash: previous ? Math.max(4500, Math.round(previous.cash * 0.5) + 2500) : 5000,
      influence: previous ? Math.min(50, Math.max(20, previous.influence)) : 20,
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
      deck: shuffle(DECK_RECIPE, random),
      hand: [],
      discard: [],
      enemyTaunt: boss.tauntStart
    };
    drawCards(state, 4);
    return state;
  }

  function playCard(state, index) {
    const item = state.hand[index];
    if (!item) return null;
    const { ap, cash, inf, infReq } = getEffectiveCosts(state, item);
    if (state.ap < ap || state.cash < cash || state.influence < Math.max(inf, infReq)) return null;
    state.ap -= ap;
    state.cash -= cash;
    state.influence -= inf;
    state.hand.splice(index, 1);
    state.discard.push(item.key);
    state.cardsPlayedThisTurn += 1;
    return executeCardEffects(item, state);
  }

  function discardCard(state, index) {
    const item = state.hand[index];
    if (!item || state.mulliganUsedThisTurn) return false;
    state.mulliganUsedThisTurn = true;
    state.hand.splice(index, 1);
    state.discard.push(item.key);
    drawCards(state, 1);
    return true;
  }

  function useJacket(state) {
    if (state.jacketUses <= 0 || state.powersUsedThisTurn.jacket || state.ap < 2) return null;
    state.ap -= 2;
    state.jacketUses -= 1;
    state.powersUsedThisTurn.jacket = true;
    const gained = Math.min(20, 100 - state.influence);
    state.influence += gained;
    return { gained, drawn: drawCards(state, 1) };
  }

  function useEquity(state) {
    if (state.equityUses <= 0 || state.powersUsedThisTurn.equity || state.ap < 1) return null;
    const target = state.seats.find(seat => seat.owner === 'player' && !seat.locked);
    if (!target) return null;
    state.ap -= 1;
    state.equityUses -= 1;
    state.powersUsedThisTurn.equity = true;
    target.locked = true;
    return target;
  }

  function useRally(state) {
    if (state.rallyUses <= 0 || state.powersUsedThisTurn.rally || state.influence < 15) return null;
    const target = claimNeutralSeat(state) || stealEnemySeat(state);
    if (!target) return null;
    state.rallyUses -= 1;
    state.powersUsedThisTurn.rally = true;
    state.influence -= 15;
    return target;
  }

  function beginEnemyTurn(state) {
    const turn = {
      cards: getEnemyCardCount(state),
      frozen: state.aiFrozen,
      played: new Set(),
      last: null,
    };
    state.aiFrozen = false;
    state.aiPenalty = 0;
    return turn;
  }

  function enemyExclusions(turn) {
    if (turn.played.size === AI_CARDS.length) {
      turn.played.clear();
      turn.played.add(turn.last);
    }
    return turn.played;
  }

  function playEnemyCard(state, turn, { card, taunt }) {
    turn.last = card.id;
    turn.played.add(card.id);
    state.enemyTaunt = taunt;
    return executeEnemyEffects(card, state);
  }

  function playEnemyPassive(state, turn) {
    if (turn.frozen) {
      state.enemyTaunt = translate("“可恶……700人联名信压下了我的额外行动！”");
      return null;
    }
    const passive = getCurrentBoss(state).onTurnEnd(state);
    if (passive) state.enemyTaunt = passive.text;
    return passive;
  }

  function nextTurn(state) {
    state.turn += 1;
    state.maxAp = Math.min(6, 3 + Math.ceil(state.turn / 2));
    state.ap = state.maxAp;
    state.heroPassiveUsedThisTurn = false;
    state.powersUsedThisTurn = { jacket: false, equity: false, rally: false };
    state.mulliganUsedThisTurn = false;
    state.cardsPlayedThisTurn = 0;
    drawCards(state, 2);
  }

  return {
    getCurrentBoss, getEffectiveCosts, makeStage, playCard, discardCard, useJacket, useEquity,
    useRally, beginEnemyTurn, enemyExclusions, playEnemyCard, playEnemyPassive, nextTurn,
    runBuiltinAi, getAiCardPool,
  };
}

export function getPlayerScore(state) {
  const seats = state.seats.filter(seat => seat.owner === 'player');
  return { votes: seats.length, locked: seats.filter(seat => seat.locked).length };
}

export function isInstantWin(stage, { votes, locked }) {
  return votes >= INSTANT_WIN_SEATS[stage - 1] || locked >= BOARD_MAJORITY;
}

export function countLockedEnemySeats(state) {
  return state.seats.filter(seat => seat.owner === 'enemy' && seat.locked).length;
}

// Mulberry32 gives the browser and server the same sequence for a given seed.
export function seededRandom(seed) {
  let value = seed;
  return () => {
    value = (value + 0x6D2B79F5) >>> 0;
    let mixed = Math.imul(value ^ (value >>> 15), value | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 0x100000000;
  };
}

const replayRules = createGameRules();

export function replayRankedRun(seed, actions) {
  if (!Array.isArray(actions) || actions.length === 0 || actions.length > MAX_RUN_ACTIONS) return null;
  let state = replayRules.makeStage(1, null, seededRandom(seed));
  let animationMs = 0;
  for (const [position, action] of actions.entries()) {
    if (!Array.isArray(action) || action.length < 1 || action.length > 2) return null;
    const [type, index] = action;
    const usesIndex = type === 'card' || type === 'discard';
    if (usesIndex ? action.length !== 2 || !Number.isInteger(index) || index < 0 || index >= 5 : action.length !== 1) return null;

    let won = false;
    switch (type) {
      case 'discard':
        if (!replayRules.discardCard(state, index)) return null;
        break;
      case 'card':
      case 'equity':
      case 'rally':
      case 'jacket': {
        const moved = type === 'card' ? replayRules.playCard(state, index)
          : type === 'equity' ? replayRules.useEquity(state)
          : type === 'rally' ? replayRules.useRally(state)
          : replayRules.useJacket(state);
        if (!moved) return null;
        animationMs += CARD_ANIMATION_MS;
        won = isInstantWin(state.stage, getPlayerScore(state));
        break;
      }
      case 'end': {
        const turn = replayRules.beginEnemyTurn(state);
        for (let i = 0; i < turn.cards; i++) {
          const move = replayRules.runBuiltinAi(state, replayRules.enemyExclusions(turn));
          replayRules.playEnemyCard(state, turn, move);
          animationMs += CARD_ANIMATION_MS;
          if (countLockedEnemySeats(state) >= BOARD_MAJORITY) return null;
        }
        if (replayRules.playEnemyPassive(state, turn)) {
          animationMs += PASSIVE_ANIMATION_MS;
          if (countLockedEnemySeats(state) >= BOARD_MAJORITY) return null;
        }
        if (state.turn === state.maxTurns) {
          won = getPlayerScore(state).votes >= BOARD_MAJORITY;
          if (!won) return null;
        } else {
          replayRules.nextTurn(state);
        }
        break;
      }
      default:
        return null;
    }

    if (!won) continue;
    if (state.stage === INSTANT_WIN_SEATS.length) {
      return position === actions.length - 1 ? { animationMs } : null;
    }
    state = replayRules.makeStage(state.stage + 1, state);
  }
  return null;
}
