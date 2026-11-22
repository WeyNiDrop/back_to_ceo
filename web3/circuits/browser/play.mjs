import { continueFirstVisit, initGame, isOnchainPlayMode, startProofChallenge } from '../../../game.js';
import { normalizePlayerName } from '../../../game-rules.mjs';
import { OPCODES } from '../ranked-input.mjs';
import { createProfileDialog, formatRewardAmount } from './profile.mjs';
import { bindSkillGuide } from './skill-guide.mjs';
import {
  AgentIdRequiredError, BSC_MAINNET_CHAIN_ID, BSC_TESTNET_CHAIN_ID, claimWalletVictory, connectAgentWallet,
  EMPTY_INVITE_CODE, mintTestAgentId, openWalletGame, registerWalletPlayer,
} from './wallet.mjs';

const controls = document.querySelector('.top-btns');
const feedback = document.createElement('div');
feedback.className = 'proof-wallet-feedback';
const walletStatus = document.createElement('p');
walletStatus.id = 'agent-wallet-status';
walletStatus.setAttribute('role', 'status');
walletStatus.textContent = '钱包未连接';
const status = document.createElement('p');
status.id = 'live-proof-status';
status.setAttribute('role', 'status');
const profileStatus = document.createElement('p');
profileStatus.id = 'agent-profile-status';
profileStatus.setAttribute('role', 'status');
profileStatus.hidden = true;
const walletRequirement = document.createElement('p');
walletRequirement.textContent = '链上模式仅支持持有 Agent ID 的钱包。';
feedback.append(walletRequirement, walletStatus, profileStatus, status);

function addButton(parent, id, text, style = 'btn-top') {
  const button = document.createElement('button');
  button.className = style;
  button.id = id;
  button.type = 'button';
  button.textContent = text;
  parent.append(button);
  return button;
}

const modeSwitch = document.createElement('div');
modeSwitch.className = 'proof-mode-switch';
modeSwitch.setAttribute('role', 'tablist');
modeSwitch.setAttribute('aria-label', '游玩模式');
const ordinaryMode = addButton(modeSwitch, 'game-tab-ordinary', '普通游玩', 'proof-mode-tab');
const chainMode = addButton(modeSwitch, 'game-tab-chain', '链上模式', 'proof-mode-tab');
controls.prepend(modeSwitch);
const ordinaryPanel = createModePanel(ordinaryMode);
const chainPanel = createModePanel(chainMode);
ordinaryPanel.append(...['btn-leaderboard', 'btn-ai-config', 'btn-restart'].map(id => document.getElementById(id)));
const playerIdentity = document.querySelector('.player-identity');
const board = document.querySelectorAll('.goal-banner, .turn-status, .enemy-hero-zone, .battlefield, .player-zone');
const connectWallet = addButton(chainPanel, 'btn-connect-wallet', '连接钱包');
connectWallet.setAttribute('aria-describedby', walletStatus.id);
const newGame = addButton(chainPanel, 'btn-proof-new-game', '新开链上牌局');
const profileButton = addButton(chainPanel, 'btn-agent-profile', '我的链上资料');
profileButton.setAttribute('aria-haspopup', 'dialog');
bindSkillGuide(addButton(chainPanel, 'btn-agent-skill-guide', 'AI Skill 指南'));
chainPanel.append(feedback);

function createModePanel(tab) {
  const panel = document.createElement('div');
  panel.className = 'proof-mode-panel';
  panel.id = `${tab.id}-panel`;
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', tab.id);
  tab.setAttribute('role', 'tab');
  tab.setAttribute('aria-controls', panel.id);
  controls.append(panel);
  return panel;
}

const endActions = document.querySelector('.end-actions');
const claim = addButton(endActions, 'btn-proof-claim', '钱包确认领奖', 'btn-save');
const download = document.createElement('a');
download.className = 'btn-save btn-action-link btn-secondary';
download.textContent = '下载证明';
download.download = 'browser-proof.json';
endActions.append(download);
const endStatus = document.getElementById('end-ranked-status');
let active;
let exportUrl;
let onchain = isOnchainPlayMode();
let chainRun = false;
let restartOrdinary = false;
claim.hidden = true;
download.hidden = true;

const registrationDialog = document.createElement('dialog');
registrationDialog.className = 'modal share-modal player-name-modal';
registrationDialog.id = 'agent-registration';
registrationDialog.setAttribute('aria-labelledby', 'agent-registration-title');
registrationDialog.innerHTML = `
  <div class="modal-header"><h2 id="agent-registration-title">注册 Agent ID 玩家</h2></div>
  <form>
    <div class="modal-body">
      <label for="agent-token-id">Agent ID NFT 的 Token ID</label>
      <input id="agent-token-id" name="agentId" type="text" maxlength="78" required autofocus>
      <button class="btn-save btn-secondary" id="btn-mint-test-agent-id" type="button" hidden>领取测试 Agent ID</button>
      <label for="agent-nickname">公开昵称</label>
      <input id="agent-nickname" name="nickname" type="text" autocomplete="nickname" maxlength="48" required>
      <label for="agent-inviter">邀请人的邀请码（6 位，选填）</label>
      <input id="agent-inviter" name="inviterCode" type="text" autocomplete="off" autocapitalize="off" spellcheck="false">
      <p class="hint-text" id="agent-registration-status" role="status"></p>
    </div>
    <div class="modal-footer">
      <button class="btn-save btn-secondary" id="btn-cancel-agent-registration" type="button">取消</button>
      <button class="btn-save" type="submit">钱包确认注册并开局</button>
    </div>
  </form>`;
document.body.append(registrationDialog);
const registrationForm = registrationDialog.querySelector('form');
const registrationStatus = registrationDialog.querySelector('#agent-registration-status');
const registerButton = registrationForm.querySelector('button[type="submit"]');
const cancelRegistration = registrationDialog.querySelector('#btn-cancel-agent-registration');
const mintButton = registrationDialog.querySelector('#btn-mint-test-agent-id');
let walletConnection;
let walletAccount;
let watchedProvider;
let walletRevision = 0;
let pendingWalletRevision;
const profileDialog = createProfileDialog();

const noticeDialog = document.createElement('dialog');
noticeDialog.className = 'modal share-modal proof-wallet-notice';
noticeDialog.setAttribute('aria-labelledby', 'agent-wallet-notice-title');
noticeDialog.setAttribute('aria-describedby', 'agent-wallet-notice-message');
noticeDialog.innerHTML = `
  <div class="modal-header"><h2 id="agent-wallet-notice-title"></h2></div>
  <div class="modal-body"><p id="agent-wallet-notice-message"></p></div>
  <form method="dialog" class="modal-footer"><button class="btn-save" autofocus></button></form>`;
document.body.append(noticeDialog);
const noticeTitle = noticeDialog.querySelector('h2');
const noticeMessage = noticeDialog.querySelector('p');
const noticeButton = noticeDialog.querySelector('button');

const proofDialog = document.createElement('dialog');
proofDialog.className = 'modal share-modal proof-wallet-notice';
proofDialog.setAttribute('aria-labelledby', 'agent-proof-loading-title');
proofDialog.innerHTML = `
  <div class="modal-header"><h2 id="agent-proof-loading-title">正在生成通关证明</h2></div>
  <div class="modal-body">
    <progress class="proof-loading-meter" aria-label="通关证明计算进度"></progress>
    <p class="hint-text" role="status"></p>
    <p>证明在此浏览器中计算。完成后可在结算页确认领奖。</p>
  </div>
  <form method="dialog" class="modal-footer"><button class="btn-save btn-secondary" autofocus>收起</button></form>`;
document.body.append(proofDialog);
const proofProgress = proofDialog.querySelector('[role="status"]');

function rewardMessage(amount, chainId) {
  if (amount === 0n) return '本次没有发放奖励。';
  const reward = formatRewardAmount(amount, chainId);
  return chainId === BSC_MAINNET_CHAIN_ID ? `获得 ${reward} 奖励凭证。兑换尚未开放。` : `获得 ${reward} 奖励。`;
}

function showWalletNotice({ title, message, action = '关闭', reward = false }) {
  noticeTitle.textContent = title;
  noticeMessage.textContent = message;
  noticeMessage.classList.toggle('proof-reward-amount', reward);
  noticeButton.textContent = action;
  noticeDialog.showModal();
}

function renderMode() {
  ordinaryMode.setAttribute('aria-selected', String(!onchain));
  chainMode.setAttribute('aria-selected', String(onchain));
  ordinaryMode.tabIndex = onchain ? -1 : 0;
  chainMode.tabIndex = onchain ? 0 : -1;
  ordinaryPanel.hidden = playerIdentity.hidden = onchain;
  chainPanel.hidden = !onchain;
  for (const section of board) section.hidden = onchain && !chainRun;
  displayWallet(walletConnection);
}

function switchMode(next) {
  if (onchain === next) return;
  walletRevision += 1;
  restartOrdinary ||= Boolean(active) || chainRun;
  active?.cancel();
  chainRun = false;
  onchain = next;
  const url = new URL(location.href);
  url.searchParams.set('mode', onchain ? 'chain' : 'ordinary');
  history.replaceState(null, '', url);
  document.getElementById('modal-end').style.display = 'none';
  status.textContent = '';
  renderMode();
  if (!onchain && restartOrdinary) {
    restartOrdinary = false;
    void initGame();
  }
  if (!onchain) continueFirstVisit();
}

ordinaryMode.addEventListener('click', () => switchMode(false));
chainMode.addEventListener('click', () => {
  switchMode(true);
  void enterChainMode();
});
connectWallet.addEventListener('click', () => {
  if (walletConnection && !walletConnection.connected.profile) showRegistration(walletConnection);
  else void enterChainMode(true);
});
modeSwitch.addEventListener('keydown', event => {
  const { key, target } = event;
  if (target !== ordinaryMode && target !== chainMode) return;
  if (!['Home', 'End', 'ArrowLeft', 'ArrowRight'].includes(key)) return;
  event.preventDefault();
  const focusTab = key === 'Home' || (key !== 'End' && target === chainMode) ? ordinaryMode : chainMode;
  (focusTab === ordinaryMode ? chainMode : ordinaryMode).tabIndex = -1;
  focusTab.tabIndex = 0;
  focusTab.focus();
});

const playAgain = document.getElementById('btn-play-again');
playAgain.addEventListener('click', event => {
  if (!onchain || playAgain.dataset.keep === '1') return;
  event.stopImmediatePropagation();
  active?.cancel();
  chainRun = false;
  document.getElementById('modal-end').style.display = 'none';
  renderMode();
  void enterChainMode(false);
}, { capture: true });

function displayWallet(connection) {
  walletConnection = connection;
  const connected = connection?.connected;
  const profile = connected?.profile;
  const pending = pendingWalletRevision === walletRevision;
  connectWallet.hidden = !onchain || Boolean(profile);
  connectWallet.disabled = pending;
  connectWallet.textContent = connected ? '继续注册' : '连接钱包';
  profileStatus.hidden = profileButton.hidden = !onchain || !profile;
  profileStatus.textContent = profile
    ? `已注册 · ${profile.nickname} · Agent ID #${profile.agentId}${profile.ownsAgentId ? '' : '（已不持有）'} · 邀请码 ${profile.inviteCode.slice(2)}`
    : '';
  newGame.hidden = !onchain || !profile?.ownsAgentId;
  newGame.disabled = pending;
  if (connected) {
    const network = connected.chainId === BSC_MAINNET_CHAIN_ID ? 'BNB Smart Chain 主网' :
      connected.chainId === BSC_TESTNET_CHAIN_ID ? 'BSC 测试网' : `链 ${connected.chainId}`;
    const account = shortenAddress(connected.player);
    walletStatus.textContent = `钱包已连接 · ${account} · ${network}${profile ? '' : ' · 尚未注册'}`;
    walletStatus.title = connected.player;
  }
}

function shortenAddress(address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function invalidateWallet() {
  walletRevision += 1;
  walletAccount = undefined;
  displayWallet(undefined);
  walletStatus.title = '';
  walletStatus.textContent = '钱包账号或网络已变更，请重新连接。';
  status.textContent = '';
  if (registrationDialog.open) registrationDialog.close();
  if (noticeDialog.open) noticeDialog.close();
  profileDialog.close();
  if (onchain) {
    active?.cancel();
    chainRun = false;
    document.getElementById('modal-end').style.display = 'none';
    renderMode();
    void enterChainMode(false);
  }
}

function accountsChanged(accounts) {
  if (accounts[0]?.toLowerCase() === walletAccount?.toLowerCase()) return;
  if (!walletAccount && pendingWalletRevision === walletRevision) return;
  invalidateWallet();
}

const walletEvents = { accountsChanged, chainChanged: invalidateWallet, disconnect: invalidateWallet };

function watchWallet(provider) {
  if (!provider || watchedProvider === provider) return;
  for (const [event, listener] of Object.entries(walletEvents)) {
    watchedProvider?.removeListener?.(event, listener);
    provider.on?.(event, listener);
  }
  watchedProvider = provider;
}

function reportWalletError(error, feedback, retryControl) {
  const code = Number(error?.code);
  const requiresAgentId = error instanceof AgentIdRequiredError;
  if (requiresAgentId || code === 4001) {
    feedback.textContent = '';
    showWalletNotice(requiresAgentId
      ? { title: '需要 Agent ID', message: error.message }
      : { title: '钱包请求已取消', message: '已取消钱包请求，可以重试。' });
    noticeDialog.addEventListener('close', () => retryControl.focus({ preventScroll: true }), { once: true });
    return;
  }
  feedback.textContent = code === -32002
    ? '钱包已有待确认请求，请打开钱包扩展查看。'
    : error?.message || '钱包请求失败，请重试。';
}

function showRegistration({ connected }) {
  registrationForm.reset();
  registrationForm.elements.nickname.value = document.getElementById('player-name-display').textContent;
  mintButton.hidden = connected.chainId !== BSC_TESTNET_CHAIN_ID || connected.mockTokenId !== 0n;
  if (connected.mockTokenId !== 0n) registrationForm.elements.agentId.value = connected.mockTokenId.toString();
  registrationStatus.textContent = connected.mockTokenId === 0n && connected.chainId === BSC_TESTNET_CHAIN_ID
    ? '请先领取测试 Agent ID，再填写昵称并确认注册。'
    : '确认注册后将进入首局排位。昵称和邀请关系会写入链上。';
  registrationDialog.showModal();
}

cancelRegistration.addEventListener('click', () => registrationDialog.close());
registrationDialog.addEventListener('cancel', event => {
  if (registerButton.disabled) event.preventDefault();
});
mintButton.addEventListener('click', async () => {
  const connection = walletConnection;
  if (!connection || mintButton.hidden || registerButton.disabled) return;
  const { provider, connected } = connection;
  mintButton.disabled = registerButton.disabled = cancelRegistration.disabled = true;
  registrationStatus.textContent = '请在钱包中确认领取测试 Agent ID。';
  try {
    const tokenId = await mintTestAgentId(provider, connected,
      hash => { if (walletConnection === connection) registrationStatus.textContent = `领取交易正在确认：${hash}`; });
    if (walletConnection !== connection) return;
    connected.mockTokenId = tokenId;
    registrationForm.elements.agentId.value = tokenId.toString();
    mintButton.hidden = true;
    registrationStatus.textContent = '测试 Agent ID 已填入。确认注册后将直接进入首局排位。';
  } catch (error) {
    if (walletConnection === connection) reportWalletError(error, registrationStatus, mintButton);
  } finally {
    mintButton.disabled = registerButton.disabled = cancelRegistration.disabled = false;
  }
});
registrationForm.addEventListener('submit', async event => {
  event.preventDefault();
  const connection = walletConnection;
  if (!connection || registerButton.disabled) return;
  const fields = new FormData(registrationForm);
  const rawId = fields.get('agentId').trim();
  const nickname = normalizePlayerName(fields.get('nickname'));
  const enteredCode = fields.get('inviterCode').trim().toLowerCase();
  const rawCode = enteredCode.replace(/^0x/, '');
  if (!/^(?:[0-9]+|0x[0-9a-f]+)$/i.test(rawId) || BigInt(rawId) >= 2n ** 256n) {
    registrationStatus.textContent = '请输入有效的数字 Token ID。';
    return;
  }
  if (!nickname || new TextEncoder().encode(nickname).length > 96) {
    registrationStatus.textContent = '请输入有效昵称，最多 24 字、96 字节。';
    return;
  }
  if (enteredCode && (!/^[0-9a-f]{6}$/.test(rawCode) || rawCode === EMPTY_INVITE_CODE.slice(2))) {
    registrationStatus.textContent = '请输入 6 位邀请码（0–9、A–F），或留空。';
    return;
  }
  registerButton.disabled = true;
  cancelRegistration.disabled = true;
  registrationStatus.textContent = '正在检查 Agent ID，请留意钱包中的注册确认请求。';
  try {
    const { provider, connected } = connection;
    const opened = await registerWalletPlayer(provider, connected, {
      agentId: BigInt(rawId), nickname, inviterCode: rawCode ? `0x${rawCode}` : EMPTY_INVITE_CODE,
    }, hash => { if (walletConnection === connection) registrationStatus.textContent = `注册交易正在确认：${hash}`; });
    if (walletConnection !== connection) return;
    displayWallet({ provider, connected: opened });
    registrationDialog.close();
    showWalletNotice({
      title: '注册成功', message: rewardMessage(opened.registrationReward, opened.chainId), action: '进入首局', reward: true,
    });
    noticeDialog.addEventListener('close', () => {
      if (!onchain || walletConnection?.connected !== opened) return;
      try {
        begin(provider, opened);
      } catch (error) {
        status.textContent = error.message;
      }
    }, { once: true });
  } catch (error) {
    const message = registrationDialog.open ? registrationStatus : status;
    if (walletConnection?.connected.player === connection.connected.player) reportWalletError(error, message, registerButton);
  } finally {
    registerButton.disabled = false;
    cancelRegistration.disabled = false;
  }
});

async function load(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`无法读取 ${path} (${response.status})`);
  return response.json();
}

function resetClaim() {
  claim.hidden = true;
  download.hidden = true;
  if (exportUrl) URL.revokeObjectURL(exportUrl);
  exportUrl = undefined;
}

function begin(provider, opened) {
  const { gameId, player } = opened;
  const worker = new Worker(new URL('./live.worker.js', import.meta.url), { type: 'module' });
  let finishAt;
  let finalCash;
  let bundle;
  let claimed = false;
  let proofError;
  const prefix = 'Agent ID 挑战';
  const session = {
    append([name, arg]) {
      if (!proofError) worker.postMessage({ type: 'action', action: { op: OPCODES[name], arg: String(arg ?? 0) } });
    },
    finish(cash) {
      if (proofError) {
        endStatus.textContent = proofError;
        return;
      }
      finishAt = performance.now();
      finalCash = cash;
      proofProgress.textContent = endStatus.textContent = '正在完成剩余证明…';
      proofDialog.showModal();
      worker.postMessage({ type: 'finish', cash });
    },
    cancel(defeated = false) {
      worker.terminate();
      if (active !== session) return;
      if (proofDialog.open) proofDialog.close();
      resetClaim();
      status.textContent = defeated ? `${prefix} · 未通关，后台证明已停止。` : '';
      active = undefined;
    },
  };

  if (!startProofChallenge(Number(BigInt(gameId) & 0xffffffffn), session)) {
    worker.terminate();
    throw new Error('请等当前开局完成后再试。');
  }
  active = session;
  chainRun = true;
  restartOrdinary = true;
  renderMode();
  resetClaim();
  status.dataset.completedSegments = '0';
  status.textContent = `${prefix} · 正在准备后台证明…`;

  function fail(message) {
    if (active !== session) return;
    proofError = `证明失败：${message}`;
    status.textContent = `${prefix} · ${proofError}`;
    if (finishAt !== undefined) endStatus.textContent = proofError;
    if (proofDialog.open) proofDialog.close();
    worker.terminate();
  }
  worker.addEventListener('error', event => fail(event.message));
  worker.addEventListener('messageerror', () => fail('无法读取证明线程的结果。'));
  worker.addEventListener('message', ({ data }) => {
    if (active !== session) return;
    if (data.type === 'progress') {
      status.dataset.completedSegments = String(data.completed);
      status.textContent = `${prefix} · ${data.text}`;
      if (finishAt !== undefined) proofProgress.textContent = endStatus.textContent = data.text;
    } else if (data.type === 'error') {
      fail(data.text);
    } else if (data.type === 'result') {
      if (proofDialog.open) proofDialog.close();
      bundle = data.proof;
      const elapsed = ((performance.now() - finishAt) / 1000).toFixed(1);
      endStatus.textContent = `证明已就绪 · 通关后等待 ${elapsed} 秒。`;
      status.textContent = `${prefix} · 已生成 ${bundle.segments.length} 段证明。`;
      exportUrl = URL.createObjectURL(new Blob([JSON.stringify(bundle)], { type: 'application/json' }));
      download.href = exportUrl;
      download.hidden = false;
      claim.hidden = false;
      claim.disabled = false;
      worker.terminate();
    }
  });

  claim.onclick = async () => {
    if (active !== session || !bundle || claimed) return;
    claim.disabled = true;
    try {
      endStatus.textContent = '请在钱包中确认领奖交易。';
      const victory = await claimWalletVictory(provider, opened, finalCash, bundle,
        hash => { if (active === session) endStatus.textContent = `领奖交易正在确认：${hash}`; });
      claimed = true;
      if (walletConnection?.connected.activeGameId === gameId && walletConnection.connected.player === player) {
        walletConnection.connected.activeGameId = 0n;
        displayWallet(walletConnection);
      }
      if (active === session) {
        const message = rewardMessage(victory.reward, opened.chainId);
        endStatus.textContent = `通关验证成功。 ${message}`;
        showWalletNotice({ title: '通关验证成功', message, reward: true });
      }
    } catch (error) {
      if (active === session) reportWalletError(error, endStatus, claim);
    } finally {
      if (active === session) claim.disabled = claimed;
    }
  };
  worker.postMessage({ type: 'start', session: { seed: BigInt(gameId).toString(), player: BigInt(player).toString(), stance_id: '0' } });
}

async function openFromButton(open) {
  const buttons = [newGame, profileButton, ordinaryMode, chainMode];
  for (const button of buttons) button.disabled = true;
  const revision = walletRevision;
  try {
    await open();
  } catch (error) {
    if (revision === walletRevision) reportWalletError(error, status, newGame);
  } finally {
    for (const button of buttons) button.disabled = false;
    displayWallet(walletConnection);
  }
}

async function enterChainMode(prompt = false) {
  if (!onchain || chainRun || pendingWalletRevision === walletRevision) return;
  const revision = walletRevision;
  pendingWalletRevision = revision;
  displayWallet(undefined);
  status.textContent = '';
  walletStatus.title = '';
  walletStatus.textContent = prompt ? '正在连接钱包，请在钱包中授权。' : '正在读取钱包账号…';
  const provider = window.ethereum;
  watchWallet(provider);
  try {
    const config = provider?.request ? load('agent-config.json') : undefined;
    const connected = await connectAgentWallet(provider, config, player => {
      if (revision !== walletRevision) return;
      walletAccount = player;
      walletStatus.textContent = `钱包已授权 · ${shortenAddress(player)} · 正在读取链上资料…`;
      walletStatus.title = player;
    }, { prompt });
    if (revision !== walletRevision) return;
    displayWallet({ provider, connected });
    if (!connected.profile) {
      showRegistration(walletConnection);
      return;
    }
    if (!connected.profile.ownsAgentId) {
      throw new AgentIdRequiredError('当前钱包已不持有注册时绑定的 Agent ID。请切换到符合条件的钱包后重试。');
    }
    if (connected.activeGameId !== 0n) {
      await playWalletGame(walletConnection);
    } else {
      status.textContent = '当前没有进行中的牌局，可以新开链上牌局。';
    }
  } catch (error) {
    if (revision !== walletRevision) return;
    if (!walletConnection) {
      walletStatus.textContent = walletAccount
        ? `钱包已授权 · ${shortenAddress(walletAccount)} · 尚未就绪`
        : '钱包未连接';
    }
    if (Number(error?.code) === 4100) {
      status.textContent = '请点击「连接钱包」授权当前账号。';
    } else {
      reportWalletError(error, status, connectWallet);
    }
  } finally {
    if (revision === pendingWalletRevision) {
      pendingWalletRevision = undefined;
      displayWallet(walletConnection);
    }
  }
}

async function playWalletGame(connection, startNew = false) {
  const { provider, connected } = connection;
  status.textContent = startNew || connected.activeGameId === 0n
    ? '请在钱包中确认开局交易。' : '正在进入链上已开局的牌局…';
  const opened = await openWalletGame(provider, connected, hash => {
    if (walletConnection === connection) status.textContent = `开局交易正在确认：${hash}`;
  }, { startNew });
  if (!onchain || walletConnection !== connection) return;
  displayWallet({ provider, connected: opened });
  begin(provider, opened);
}

newGame.addEventListener('click', () => void openFromButton(async () => {
  if (walletConnection?.connected.profile) await playWalletGame(walletConnection, true);
}));

profileButton.addEventListener('click', () => {
  const connection = walletConnection;
  if (!connection?.connected.profile) return;
  profileDialog.show(connection, profile => {
    if (walletConnection !== connection) return;
    connection.connected.profile = profile;
    connection.connected.activeGameId = profile.activeGameId;
    displayWallet(connection);
  });
});

renderMode();
const languageDialog = document.getElementById('language-dialog');
if (languageDialog.open) languageDialog.addEventListener('close', () => void enterChainMode(), { once: true });
else void enterChainMode();
