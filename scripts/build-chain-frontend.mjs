import { copyFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const browser = new URL('../web3/circuits/browser/', import.meta.url);
const dependencies = new URL('../node_modules/', import.meta.url);
const wasm = new URL('@aztec-foundation/bb.js/dest/browser/barretenberg_wasm/', dependencies);
const agentConfig = {
  chainId: 56,
  gameAddress: '0xcAc5967c13c1fcAFCa572FAdC4bE3F92b6681FF5',
  registry: '0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F',
};

export async function buildChainFrontend(output, html) {
  const gameScript = /<script type="module" src="game\.js[^"]*"><\/script>/;
  if (!gameScript.test(html)) throw new Error('Cannot find the game script in the production page');
  const page = html.replace(gameScript, '<script type="module" src="/play.js"></script>')
    .replace('</head>', `  <link rel="alternate" type="text/plain" title="AI play instructions" href="/llms.txt">
  <link rel="help" title="Back To CEO 游戏规则" href="/game-rules.html">
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

  await Promise.all([
    writeFile(new URL('index.html', output), page),
    writeFile(new URL('play.html', output), page.replace('<html ', '<html data-wallet-game ')),
    writeFile(new URL('agent-config.json', output), JSON.stringify(agentConfig)),
    writeFile(new URL('_headers', output), `/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
/agent-config.json
  Cache-Control: no-store
`),
    ...['llms.txt', 'game-rules.html'].map(file =>
      copyFile(new URL(file, browser), new URL(file, output))),
    ...['ranked_plan.json', 'ranked_segment.json'].map(file =>
      copyFile(new URL(`artifacts/${file}`, browser), new URL(file, output))),
    ...['@noir-lang/acvm_js/web/acvm_js_bg.wasm', '@noir-lang/noirc_abi/web/noirc_abi_wasm_bg.wasm'].map(file =>
      copyFile(new URL(file, dependencies), new URL(file.split('/').at(-1), output))),
  ]);
}
