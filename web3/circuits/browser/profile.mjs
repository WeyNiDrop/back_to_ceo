import { formatEther, zeroAddress } from 'viem';
import { BSC_MAINNET_CHAIN_ID, BSC_TESTNET_CHAIN_ID, readWalletInvitees, readWalletProfile } from './wallet.mjs';

const INVITEE_PAGE_SIZE = 10n;
const dateFormat = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'short', timeStyle: 'short' });
export function formatRewardAmount(amount, chainId) {
  const symbol = chainId === BSC_MAINNET_CHAIN_ID ? 'vCEO' : chainId === BSC_TESTNET_CHAIN_ID ? 'mCEO' : 'CEO';
  return `${formatEther(amount)} ${symbol}`;
}

function row(values) {
  const tr = document.createElement('tr');
  for (const value of values) {
    const td = document.createElement('td');
    td.textContent = value;
    tr.append(td);
  }
  return tr;
}

export function createProfileDialog() {
  const dialog = document.createElement('dialog');
  dialog.id = 'agent-profile-dialog';
  dialog.className = 'modal share-modal proof-profile-modal';
  dialog.setAttribute('aria-labelledby', 'agent-profile-title');
  dialog.innerHTML = `
    <div class="modal-header"><h2 id="agent-profile-title">我的链上资料</h2></div>
    <div class="modal-body">
      <p class="hint-text" data-profile-status role="status"></p>
      <div data-profile-details hidden>
        <div class="proof-invite-code">
          <span>我的邀请码</span>
          <strong data-invite-code></strong>
          <button class="btn-top" type="button" data-copy-code>复制邀请码</button>
        </div>
        <dl class="proof-profile-fields"></dl>
        <section aria-labelledby="agent-reward-title">
          <h3 id="agent-reward-title">个人奖励记录</h3>
          <p class="hint-text" data-reward-status></p>
          <table class="proof-profile-table" data-rewards>
            <thead><tr><th scope="col">牌局 / 来源</th><th scope="col">奖励</th><th scope="col">时间</th></tr></thead>
            <tbody></tbody>
          </table>
        </section>
      </div>
      <section aria-labelledby="agent-invitees-title">
        <h3 id="agent-invitees-title">我的邀请记录</h3>
        <p class="hint-text" data-invitee-status role="status"></p>
        <table class="proof-profile-table" data-invitees hidden>
          <thead><tr><th scope="col">受邀钱包</th><th scope="col">累计带来的奖励</th></tr></thead>
          <tbody></tbody>
        </table>
        <div class="proof-profile-pagination">
          <button class="btn-top" type="button" data-prev hidden>上一页</button>
          <button class="btn-top" type="button" data-next hidden>下一页</button>
          <button class="btn-top" type="button" data-retry hidden>重试</button>
        </div>
      </section>
    </div>
    <form method="dialog" class="modal-footer"><button class="btn-save btn-secondary" autofocus>关闭</button></form>`;
  document.body.append(dialog);

  const profileStatus = dialog.querySelector('[data-profile-status]');
  const details = dialog.querySelector('[data-profile-details]');
  const code = dialog.querySelector('[data-invite-code]');
  const copyCode = dialog.querySelector('[data-copy-code]');
  const fields = dialog.querySelector('dl');
  const rewardStatus = dialog.querySelector('[data-reward-status]');
  const rewardTable = dialog.querySelector('[data-rewards]');
  const inviteeStatus = dialog.querySelector('[data-invitee-status]');
  const inviteeTable = dialog.querySelector('[data-invitees]');
  const previous = dialog.querySelector('[data-prev]');
  const next = dialog.querySelector('[data-next]');
  const retry = dialog.querySelector('[data-retry]');
  let current;
  let page = 0n;
  let requestedPage = 0n;

  function renderProfile({ player, chainId }, profile) {
    const reward = amount => formatRewardAmount(amount, chainId);
    code.textContent = profile.inviteCode.slice(2);
    const items = [
      ['昵称', profile.nickname],
      ['钱包地址', player],
      ['Agent ID', `#${profile.agentId} · ${profile.ownsAgentId ? '当前持有' : '已不持有'}`],
      ['邀请人', profile.inviter === zeroAddress ? '无' : profile.inviter],
      [chainId === BSC_MAINNET_CHAIN_ID ? 'vCEO 凭证余额' : '钱包奖励余额', reward(profile.balance)],
      ['累计获得', reward(profile.totalRewardsEarned)],
      ['个人奖励', reward(profile.totalPersonalRewards)],
      ['邀请奖励', reward(profile.totalReferralRewards)],
      ['通关奖励次数', `已领 ${profile.victoryClaims} 次 · 剩余 ${profile.victoryClaimsRemaining} 次`],
      ['当前 Game ID', profile.activeGameId === 0n ? '暂无' : profile.activeGameId.toString()],
    ];
    fields.replaceChildren();
    for (const [label, value] of items) {
      const term = document.createElement('dt');
      const description = document.createElement('dd');
      term.textContent = label;
      description.textContent = value;
      fields.append(term, description);
    }
    const rewards = profile.recentRewards.filter(record => record.timestamp !== 0n);
    rewardTable.querySelector('tbody').replaceChildren(...rewards.map(record => row([
      record.gameId === 0n ? '注册奖励' : record.gameId.toString(),
      reward(record.amount),
      dateFormat.format(Number(record.timestamp) * 1000),
    ])));
    rewardTable.hidden = rewards.length === 0;
    rewardStatus.textContent = rewards.length === 0 ? '暂无个人奖励' : `显示最近 ${rewards.length} 条 · 共 ${profile.rewardCount} 条`;
    details.hidden = false;
  }

  async function loadInvites(target) {
    if (!current) return;
    const connection = current;
    requestedPage = target;
    previous.disabled = next.disabled = true;
    retry.hidden = true;
    inviteeStatus.textContent = '正在读取邀请记录…';
    try {
      const [invitees, total] = await readWalletInvitees(connection.provider, connection.connected, target, INVITEE_PAGE_SIZE);
      if (current !== connection || !dialog.open) return;
      page = target;
      const pageCount = (total + INVITEE_PAGE_SIZE - 1n) / INVITEE_PAGE_SIZE;
      inviteeTable.querySelector('tbody').replaceChildren(...invitees.map(entry =>
        row([entry.player, formatRewardAmount(entry.reward, connection.connected.chainId)])));
      inviteeTable.hidden = !invitees.length;
      inviteeStatus.textContent = total === 0n ? '还没有受邀玩家' : `第 ${page + 1n} / ${pageCount} 页 · 共 ${total} 人`;
      previous.hidden = next.hidden = pageCount <= 1n;
      previous.disabled = page === 0n;
      next.disabled = page + 1n >= pageCount;
    } catch (error) {
      if (current !== connection || !dialog.open) return;
      inviteeStatus.textContent = `邀请记录读取失败 · ${error.message}`;
      retry.hidden = false;
    }
  }

  previous.addEventListener('click', () => void loadInvites(page - 1n));
  next.addEventListener('click', () => void loadInvites(page + 1n));
  retry.addEventListener('click', () => void loadInvites(requestedPage));
  copyCode.addEventListener('click', async () => {
    const connection = current;
    try {
      await navigator.clipboard.writeText(code.textContent);
      if (current === connection) profileStatus.textContent = '邀请码已复制。';
    } catch {
      if (current === connection) profileStatus.textContent = '请选中上方的邀请码并复制。';
    }
  });

  return {
    show(connection, onProfile) {
      current = { ...connection };
      const request = current;
      details.hidden = inviteeTable.hidden = previous.hidden = next.hidden = true;
      profileStatus.textContent = '正在读取链上资料…';
      dialog.showModal();
      void loadInvites(0n);
      void readWalletProfile(request.provider, request.connected).then(profile => {
        if (current !== request || !dialog.open) return;
        renderProfile(request.connected, profile);
        onProfile(profile);
        profileStatus.textContent = '';
      }).catch(error => {
        if (current === request && dialog.open) profileStatus.textContent = `链上资料读取失败 · ${error.message}`;
      });
    },
    close() {
      current = undefined;
      if (dialog.open) dialog.close();
    },
  };
}
