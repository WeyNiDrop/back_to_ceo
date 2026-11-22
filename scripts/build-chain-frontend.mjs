import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { parseAbi } from 'viem';
import { skillGuideUrl, skillInstallCommand, skillPlayPrompt } from '../web3/circuits/browser/skill-guide.mjs';
import { BSC_AGENT_ID, BSC_MAINNET_CHAIN_ID, walletAbi } from '../web3/circuits/browser/wallet.mjs';

const browser = new URL('../web3/circuits/browser/', import.meta.url);
const dependencies = new URL('../node_modules/', import.meta.url);
const wasm = new URL('@aztec-foundation/bb.js/dest/browser/barretenberg_wasm/', dependencies);
const agentConfig = {
  chainId: BSC_MAINNET_CHAIN_ID,
  gameAddress: '0xcAc5967c13c1fcAFCa572FAdC4bE3F92b6681FF5',
  registry: BSC_AGENT_ID,
  rewardToken: '0x8EA25df5AE9F700DaE0213Af2D11729f5317F38d',
  verifier: '0x98460cCd9FC6dDF8560C436c3bc8E2861266DaFd',
  docsUrl: '/docs/onchain.md',
  playGuideUrl: '/docs/play-and-prove.md',
  skillUrl: '/skills/back-to-ceo/SKILL.md',
  skillGuideUrl,
  skillInstallCommand,
};

const gameMethods = new Set([
  'agentIdRegistry', 'getProfile', 'getInvitees', 'register', 'startGame', 'claimVictory',
  'PlayerRegistered', 'RegistrationRewarded', 'GameStarted', 'VictoryClaimed',
]);
const gameAbi = [
  ...walletAbi.filter(entry => gameMethods.has(entry.name)),
  ...parseAbi([
    'function rewardToken() view returns (address)',
    'function verifier() view returns (address)',
  ]),
];

async function renderAgentDoc(file) {
  const text = await readFile(new URL(file, browser), 'utf8');
  const fields = { ...agentConfig, skillPlayPrompt };
  return text.replace(/\{\{(\w+)\}\}/g, (match, field) => {
    if (!Object.hasOwn(fields, field)) throw new Error(`Unknown deployment field ${match}`);
    return fields[field];
  });
}

export async function buildChainFrontend(output, html) {
  const gameScript = /<script type="module" src="game\.js[^"]*"><\/script>/;
  if (!gameScript.test(html)) throw new Error('Cannot find the game script in the production page');
  const configJson = JSON.stringify(agentConfig);
  const page = html.replace(gameScript, '<script type="module" src="/play.js"></script>')
    .replace('</head>', `  <link rel="describedby" type="text/plain" title="AI play instructions" href="/llms.txt">
  <link rel="help" type="text/markdown" title="Back To CEO on-chain documentation" href="${agentConfig.docsUrl}">
  <link rel="help" type="text/markdown" title="Back To CEO browser play and proof guide" href="${agentConfig.playGuideUrl}">
  <link rel="help" type="text/markdown" title="Back To CEO Skill installation and usage" href="${skillGuideUrl}">
  <link rel="alternate" type="text/markdown" title="Back To CEO Skill" href="${agentConfig.skillUrl}">
  <link rel="help" title="Back To CEO 游戏规则" href="/game-rules.html">
  <script type="application/json" id="back-to-ceo-agent-config">${configJson}</script>
</head>`);

  await build({
    entryPoints: {
      play: fileURLToPath(new URL('play.mjs', browser)),
      'live.worker': fileURLToPath(new URL('live.worker.mjs', browser)),
      'main.worker': fileURLToPath(new URL('barretenberg_wasm_main/factory/browser/main.worker.js', wasm)),
      'thread.worker': fileURLToPath(new URL('barretenberg_wasm_thread/factory/browser/thread.worker.js', wasm)),
    },
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    outdir: fileURLToPath(output),
  });

  const [skill, llms, onchain, playGuide, skillGuide] = await Promise.all([
    readFile(new URL('../skills/back-to-ceo/SKILL.md', import.meta.url), 'utf8'),
    renderAgentDoc('llms.txt'),
    renderAgentDoc('onchain.md'),
    renderAgentDoc('play-and-prove.md'),
    renderAgentDoc('skill-guide.md'),
  ]);
  const description = skill.match(/^description: (.+)$/m)?.[1];
  if (!description) throw new Error('Back To CEO Skill requires a description');
  const discovery = {
    $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
    skills: [{
      name: 'back-to-ceo',
      type: 'skill-md',
      description,
      url: agentConfig.skillUrl,
      digest: 'sha256:' + createHash('sha256').update(skill).digest('hex'),
    }],
  };
  await Promise.all(['docs/', 'skills/back-to-ceo/', '.well-known/agent-skills/'].map(directory =>
    mkdir(new URL(directory, output), { recursive: true })));
  await Promise.all([
    writeFile(new URL('index.html', output), page),
    writeFile(new URL('play.html', output), page.replace('<html ', '<html data-wallet-game ')),
    writeFile(new URL('agent-config.json', output), configJson),
    writeFile(new URL('llms.txt', output), llms),
    writeFile(new URL('docs/onchain.md', output), onchain),
    writeFile(new URL('docs/play-and-prove.md', output), playGuide),
    writeFile(new URL(skillGuideUrl.slice(1), output), skillGuide),
    writeFile(new URL('docs/game-abi.json', output), JSON.stringify(gameAbi)),
    writeFile(new URL('skills/back-to-ceo/SKILL.md', output), skill),
    writeFile(new URL('.well-known/agent-skills/index.json', output), JSON.stringify(discovery)),
    writeFile(new URL('_headers', output), `/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
/
  Link: </llms.txt>; rel="describedby"; type="text/plain", <${agentConfig.docsUrl}>; rel="help"; type="text/markdown", <${agentConfig.playGuideUrl}>; rel="help"; type="text/markdown", <${skillGuideUrl}>; rel="help"; type="text/markdown", <${agentConfig.skillUrl}>; rel="alternate"; type="text/markdown"
/agent-config.json
  Cache-Control: no-store
${agentConfig.docsUrl}
  Content-Type: text/markdown; charset=utf-8
${agentConfig.playGuideUrl}
  Content-Type: text/markdown; charset=utf-8
${skillGuideUrl}
  Content-Type: text/markdown; charset=utf-8
${agentConfig.skillUrl}
  Content-Type: text/markdown; charset=utf-8
`),
    copyFile(new URL('game-rules.html', browser), new URL('game-rules.html', output)),
    ...['ranked_plan.json', 'ranked_segment.json'].map(file =>
      copyFile(new URL(`artifacts/${file}`, browser), new URL(file, output))),
    ...['@noir-lang/acvm_js/web/acvm_js_bg.wasm', '@noir-lang/noirc_abi/web/noirc_abi_wasm_bg.wasm'].map(file =>
      copyFile(new URL(file, dependencies), new URL(file.split('/').at(-1), output))),
  ]);
}
