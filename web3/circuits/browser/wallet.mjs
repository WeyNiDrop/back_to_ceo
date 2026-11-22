import {
  decodeEventLog, decodeFunctionResult, encodeAbiParameters, encodeFunctionData, getAddress, parseAbi,
} from 'viem';

export const BSC_AGENT_ID = '0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F';
export const BSC_MAINNET_CHAIN_ID = 56;
export const BSC_TESTNET_CHAIN_ID = 97;
export const EMPTY_INVITE_CODE = '0x000000';

export class AgentIdRequiredError extends Error {}

const abi = parseAbi([
  'function balanceOf(address player) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function latestTokenId(address player) view returns (uint256)',
  'function mint() returns (uint256 tokenId)',
  'function agentIdRegistry() view returns (address)',
  'function getProfile(address player) view returns ((bool registered, bool ownsAgentId, uint256 agentId, bytes3 inviteCode, address inviter, string nickname, uint256 balance, uint256 activeGameId, uint256 inviteeCount, uint256 rewardCount, uint256 totalRewardsEarned, (uint256 gameId, uint96 amount, uint64 timestamp)[16] recentRewards, uint8 victoryClaims, uint8 victoryClaimsRemaining, uint256 totalPersonalRewards, uint256 totalReferralRewards) profile)',
  'function getInvitees(address inviter, uint256 page, uint256 pageSize) view returns ((address player, uint96 reward)[] players, uint256 total)',
  'function register(uint256 agentId, string nickname, bytes3 inviterCode) returns (bytes3 inviteCode, uint256 gameId)',
  'function startGame() returns (uint256 gameId)',
  'function claimVictory(uint256 gameId, uint8 stanceId, uint32 finalScore, bytes proof) returns (uint256 reward)',
  'event PlayerRegistered(address indexed player, uint256 indexed agentId, bytes3 inviteCode, address indexed inviter)',
  'event RegistrationRewarded(address indexed player, uint256 amount)',
  'event GameStarted(uint256 indexed gameId, address indexed player, uint256 rewardsPaidSnapshot)',
  'event VictoryClaimed(uint256 indexed gameId, address indexed player, uint256 reward, uint32 finalScore)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
]);
export { abi as walletAbi };

function chainConfig({ chainId, gameAddress, registry }) {
  if (!Number.isSafeInteger(chainId) || chainId <= 0 || !gameAddress) {
    throw new Error('尚未配置已部署的奖励合约。');
  }
  return {
    chainId,
    gameAddress: getAddress(gameAddress),
    registry: chainId === BSC_MAINNET_CHAIN_ID ? BSC_AGENT_ID : getAddress(registry),
  };
}

async function read(provider, address, functionName, args = []) {
  const data = encodeFunctionData({ abi, functionName, args });
  const result = await provider.request({ method: 'eth_call', params: [{ to: address, data }, 'latest'] });
  return decodeFunctionResult({ abi, functionName, data: result });
}

async function ensureWallet(provider, config, account) {
  const [chainId, accounts] = await Promise.all([
    provider.request({ method: 'eth_chainId' }),
    provider.request({ method: 'eth_accounts' }),
  ]);
  if (BigInt(chainId) !== BigInt(config.chainId)) {
    const network = config.chainId === BSC_MAINNET_CHAIN_ID ? 'BNB Smart Chain 主网' : `链 ${config.chainId}`;
    throw new Error(`请在钱包中切换到 ${network}。`);
  }
  if (!accounts[0] || getAddress(accounts[0]) !== account) throw new Error('请切回开局使用的钱包账号。');
}

async function confirm(provider, config, account, contract, functionName, args = [], onSubmitted = () => {}) {
  await ensureWallet(provider, config, account);
  const data = encodeFunctionData({ abi, functionName, args });
  const hash = await provider.request({
    method: 'eth_sendTransaction', params: [{ from: account, to: contract, data }],
  });
  onSubmitted(hash);
  const timeout = Date.now() + 120_000;
  while (Date.now() < timeout) {
    const receipt = await provider.request({ method: 'eth_getTransactionReceipt', params: [hash] });
    if (receipt) {
      await ensureWallet(provider, config, account);
      if (BigInt(receipt.status) !== 1n) throw new Error('交易执行失败。');
      return receipt;
    }
    await new Promise(ready => setTimeout(ready, 650));
  }
  throw new Error(`交易尚在确认，请在钱包中查询 ${hash}。`);
}

function findEvent(receipt, address, eventName) {
  for (const log of receipt.logs) {
    if (getAddress(log.address) !== address) continue;
    try {
      const decoded = decodeEventLog({ abi, eventName, data: log.data, topics: log.topics });
      if (decoded.eventName === eventName) return decoded.args;
    } catch {
      // A reward transaction may also emit unrelated ERC-20 events.
    }
  }
}

function readEvent(receipt, address, eventName) {
  const args = findEvent(receipt, address, eventName);
  if (!args) throw new Error(`交易缺少 ${eventName} 事件。`);
  return args;
}

export async function connectAgentWallet(provider, rawConfig, onAuthorized = () => {}, { prompt = true } = {}) {
  if (!provider?.request) throw new Error('未检测到钱包。请在装有钱包扩展的浏览器中打开此页面。');
  const [accounts, selectedConfig] = await Promise.all([
    provider.request({ method: prompt ? 'eth_requestAccounts' : 'eth_accounts' }),
    rawConfig,
  ]);
  const config = chainConfig(selectedConfig);
  if (!accounts[0]) throw new Error('钱包未授权。点击「链上模式」页签连接。');
  const player = getAddress(accounts[0]);
  onAuthorized(player);
  await ensureWallet(provider, config, player);

  const [actualRegistry, snapshot] = await Promise.all([
    read(provider, config.gameAddress, 'agentIdRegistry'),
    read(provider, config.gameAddress, 'getProfile', [player]),
  ]);
  if (getAddress(actualRegistry) !== config.registry) throw new Error('奖励合约的 Agent ID 注册表与配置不匹配。');
  const onTestnet = config.chainId === BSC_TESTNET_CHAIN_ID;
  let mockTokenId = 0n;
  if (!snapshot.registered) {
    const balance = await read(provider, config.registry, 'balanceOf', [player]);
    if (onTestnet && balance > 0n) mockTokenId = await read(provider, config.registry, 'latestTokenId', [player]);
    if (!onTestnet && balance === 0n) {
      throw new AgentIdRequiredError('当前钱包还没有 Agent ID。请在币安 App 的钱包首页领取，或切换到持有 Agent ID 的钱包后重试。');
    }
  }
  await ensureWallet(provider, config, player);
  const profile = snapshot.registered ? snapshot : null;
  return { ...config, player, profile, mockTokenId, activeGameId: snapshot.activeGameId };
}

export function readWalletProfile(provider, { gameAddress, player }) {
  return read(provider, gameAddress, 'getProfile', [player]);
}

export function readWalletInvitees(provider, { gameAddress, player }, page, pageSize) {
  return read(provider, gameAddress, 'getInvitees', [player, page, pageSize]);
}

export async function mintTestAgentId(provider, connected, onSubmitted) {
  if (connected.chainId !== BSC_TESTNET_CHAIN_ID) throw new Error('测试 Agent ID 只能在 BSC 测试网领取。');
  const { player, registry } = connected;
  const receipt = await confirm(provider, connected, player, registry, 'mint', [], onSubmitted);
  const minted = readEvent(receipt, registry, 'Transfer');
  if (BigInt(minted.from) !== 0n || getAddress(minted.to) !== player || minted.tokenId === 0n) {
    throw new Error('测试 Agent ID 领取回执与当前账号不匹配。');
  }
  return minted.tokenId;
}

export async function registerWalletPlayer(provider, connected, { agentId, nickname, inviterCode }, onSubmitted) {
  const { player, gameAddress, registry } = connected;
  const owner = await read(provider, registry, 'ownerOf', [agentId]).catch(() => null);
  if (!owner || getAddress(owner) !== player) throw new Error('该 Agent ID Token ID 不属于当前钱包。');

  const receipt = await confirm(provider, connected, player, gameAddress, 'register', [agentId, nickname, inviterCode], onSubmitted);
  const registered = readEvent(receipt, gameAddress, 'PlayerRegistered');
  if (getAddress(registered.player) !== player || registered.agentId !== agentId ||
      registered.inviteCode === EMPTY_INVITE_CODE) {
    throw new Error('注册回执与本次请求不匹配。');
  }
  const reward = findEvent(receipt, gameAddress, 'RegistrationRewarded');
  if (reward && getAddress(reward.player) !== player) throw new Error('注册奖励回执与当前账号不匹配。');
  const profile = { registered: true, ownsAgentId: true, agentId, inviteCode: registered.inviteCode, nickname };
  return { ...readOpenedGame(receipt, { ...connected, profile }), registrationReward: reward?.amount ?? 0n };
}

function readOpenedGame(receipt, connected) {
  const { player, gameAddress } = connected;
  const opened = readEvent(receipt, gameAddress, 'GameStarted');
  if (getAddress(opened.player) !== player || opened.gameId === 0n) {
    throw new Error('开局回执与当前账号不匹配。');
  }
  return { ...connected, gameId: opened.gameId, activeGameId: opened.gameId };
}

export async function openWalletGame(provider, connected, onSubmitted, { startNew = false } = {}) {
  const { player, gameAddress } = connected;
  if (!connected.profile) throw new Error('请先完成 Agent ID 注册。');
  if (!connected.profile.ownsAgentId) throw new AgentIdRequiredError('此钱包已不持有注册时绑定的 Agent ID。');
  if (!startNew && connected.activeGameId !== 0n) {
    await ensureWallet(provider, connected, player);
    return { ...connected, gameId: connected.activeGameId };
  }
  const receipt = await confirm(provider, connected, player, gameAddress, 'startGame', [], onSubmitted);
  return readOpenedGame(receipt, connected);
}

export async function claimWalletVictory(provider, opened, cash, proof, onSubmitted) {
  const payload = encodeAbiParameters([{ type: 'bytes[]' }, { type: 'bytes32[]' }], [
    proof.segments.map(segment => segment.proof), proof.commitments,
  ]);
  const receipt = await confirm(provider, opened, opened.player, opened.gameAddress, 'claimVictory',
    [opened.gameId, 0, cash, payload], onSubmitted);
  const victory = readEvent(receipt, opened.gameAddress, 'VictoryClaimed');
  if (victory.gameId !== opened.gameId || getAddress(victory.player) !== opened.player) {
    throw new Error('领奖事件与当前牌局不匹配。');
  }
  return victory;
}
