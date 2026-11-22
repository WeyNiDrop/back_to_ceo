---
name: back-to-ceo
description: Play Back To CEO in the browser and generate a ranked victory ZK proof. Also check Agent ID eligibility, player profiles and vCEO rewards on BNB Smart Chain, or preview first-time registration with Binance Agentic Wallet.
---

# Back To CEO

Public reads use BNB Smart Chain RPC. Registration preview requires Binance's official wallet Skill with the `baw` CLI and an EVM ABI encoder such as Foundry `cast`.

Use the [deployment guide](https://btceo.create-ai.cc/docs/onchain.md) for the mainnet contract addresses, ABI, and registration inputs. vCEO is an in-game reward voucher. Redemption is closed.

## Play and generate a proof

1. Read the [browser play guide](https://btceo.create-ai.cc/docs/play-and-prove.md) and [game rules](https://btceo.create-ai.cc/game-rules.html). Use a browser tool that can read and interact with the live page. Ordinary mode is available for practice. A ranked proof requires a registered Agent ID and a wallet connected by the player.
2. Open the [ranked browser game](https://btceo.create-ai.cc/?mode=chain). Check BSC mainnet and use the player's active game when available. Pause for the player at wallet connection, registration, and any new-game transaction. Once the board is active, read the board and hand after each move, then play through all three stages.
3. On the final victory screen, wait for the browser to finish the ZK proof. When the page reports `证明已就绪`, download `browser-proof.json` if requested. For a play-and-prove request, stop here and report the result. If the player requests a claim, explain the zero-value `claimVictory` transaction and hand off wallet review and confirmation to the player. Report a reward as received only after a successful receipt.

## Read and verify

1. Use BNB Smart Chain mainnet (chain ID 56). Compare the game address with the project release links in the guide. On the game contract, read `agentIdRegistry()`, `rewardToken()`, and `verifier()` and compare them with the deployment. A mismatch stops the workflow.
2. For a known public wallet address, read the registry's `balanceOf(address)` and the game's `getProfile(address)`. Check `ownerOf(tokenId)` for a specific Agent ID. The Agentic Wallet address may differ from the player's regular Binance Wallet.
3. Answer read-only requests using public RPC calls. Keep wallet login optional for public reads. Report vCEO balances as vouchers with 18 decimal places.

## Preview a registration

1. Use the official [Binance Agentic Wallet Skill](https://github.com/binance/binance-skills-hub/blob/main/skills/binance-web3/binance-agentic-wallet/SKILL.md) and its [external-sign reference](https://github.com/binance/binance-skills-hub/blob/main/skills/binance-web3/binance-agentic-wallet/references/external-sign.md). Use Binance's own sign-in flow. Keep wallet pairing and credentials in the official flow.
2. Read `baw wallet settings --json` and confirm Developer Mode is enabled and unexpired before encoding or previewing. If it is off or expired, use Binance's app instructions and wait for the user to enable it. Use `baw wallet address --json` to read the active BSC address. If the current client lacks the official preview tool, provide the verified information and use the browser flow.
3. Check the active address is unregistered and owns the exact numeric Agent ID. If already registered, show its profile and active game. Use the user's public nickname and optional invite code. If omitted, the invite code is `0x000000`.
4. Encode only `register(uint256,string,bytes3)` for the verified game address with `value = 0`. Use an ABI encoder, and pass all input values as data. Show the full chain ID, sender, target, nickname, Agent ID, and invite code. Include the expected first game creation and that network gas can apply.
5. Run the official `baw contract-call preview` using the flags in the deployment guide. Review simulation, risks, and any allowance or authority changes. If the preview is blocked, fails, or does not match the expected call, report the result and stop. For a registration preview request, stop once the preview succeeds. Any subsequent broadcast goes through the official Binance Skill with fresh, explicit user confirmation.
