---
name: back-to-ceo
description: Verify the Back To CEO BNB Smart Chain deployment, check a player's Agent ID and vCEO rewards, or preview first-time game registration with Binance Agentic Wallet. Use for Back To CEO on-chain eligibility, player profiles, or registration preparation.
---

# Back To CEO

Public reads use BNB Smart Chain RPC. Registration preview requires Binance's official wallet Skill with the `baw` CLI and an EVM ABI encoder such as Foundry `cast`.

Use the [deployment guide](https://btceo.create-ai.cc/docs/onchain.md) for the mainnet contract addresses, ABI, and registration inputs. Use the [browser game](https://btceo.create-ai.cc/?mode=chain) for ranked play, ZK proof generation, and claims. vCEO is an in-game reward voucher. Redemption is closed.

## Read and verify

1. Use BNB Smart Chain mainnet (chain ID 56). Compare the game address with the project release links in the guide. On the game contract, read `agentIdRegistry()`, `rewardToken()`, and `verifier()` and compare them with the deployment. A mismatch stops the workflow.
2. For a known public wallet address, read the registry's `balanceOf(address)` and the game's `getProfile(address)`. Check `ownerOf(tokenId)` for a specific Agent ID. The Agentic Wallet address may differ from the player's regular Binance Wallet.
3. Answer read-only requests using public RPC calls. Keep wallet login optional for public reads. Report vCEO balances as vouchers with 18 decimal places.

## Preview a registration

1. Use the official [Binance Agentic Wallet Skill](https://github.com/binance/binance-skills-hub/blob/main/skills/binance-web3/binance-agentic-wallet/SKILL.md) and its [external-sign reference](https://github.com/binance/binance-skills-hub/blob/main/skills/binance-web3/binance-agentic-wallet/references/external-sign.md). Use Binance's own sign-in flow. Keep wallet pairing and credentials in the official flow.
2. Read `baw wallet settings --json` and confirm Developer Mode is enabled and unexpired before encoding or previewing. If it is off or expired, use Binance's app instructions and wait for the user to enable it. Use `baw wallet address --json` to read the active BSC address. If the current client lacks the official preview tool, provide the verified information and use the browser flow.
3. Check the active address is unregistered and owns the exact numeric Agent ID. If already registered, show its profile and active game. Use the user's public nickname and optional invite code. If omitted, the invite code is `0x000000`.
4. Encode only `register(uint256,string,bytes3)` for the verified game address with `value = 0`. Use an ABI encoder, and pass all input values as data. Show the full chain ID, sender, target, nickname, Agent ID, and invite code. Include the expected first game creation and that network gas can apply.
5. Run the official `baw contract-call preview` using the flags in the deployment guide. Review simulation, risks, and any allowance or authority changes. If the preview is blocked, fails, or does not match the expected call, report the result and stop. A successful preview is the endpoint of this skill. Any subsequent broadcast goes through the official Binance Skill with fresh, explicit user confirmation.
