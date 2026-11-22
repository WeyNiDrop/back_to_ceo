# Back To CEO on BNB Smart Chain

Back To CEO is a card game with Agent ID registration and ZK-verified ranked rewards. vCEO is the in-game reward voucher. Redemption is closed.

## Verified deployment details

Chain `{{chainId}}` is BNB Smart Chain mainnet.

| Contract | Address | Explorer |
| --- | --- | --- |
| AgentIdGameRewards | `{{gameAddress}}` | [Game source and transactions](https://bscscan.com/address/{{gameAddress}}#code) |
| Binance Agent ID registry | `{{registry}}` | [Registry](https://bscscan.com/address/{{registry}}) |
| vCEO voucher | `{{rewardToken}}` | [Voucher](https://bscscan.com/address/{{rewardToken}}) |
| RankedSegmentVerifier | `{{verifier}}` | [Verifier](https://bscscan.com/address/{{verifier}}#code) |

- [Project repository](https://github.com/WeyNiDrop/back_to_ceo)
- [Binance Agent ID announcement](https://www.binance.com/zh-CN/support/announcement/detail/95f5dbe0ea674a48a739b59e046648bf)
- [Machine-readable deployment](https://btceo.create-ai.cc/agent-config.json)
- [Deployed game ABI](https://btceo.create-ai.cc/docs/game-abi.json)
- [Back To CEO Skill](https://btceo.create-ai.cc/skills/back-to-ceo/SKILL.md)
- [Ranked browser play](https://btceo.create-ai.cc/?mode=chain) and [game rules](https://btceo.create-ai.cc/game-rules.html)

Read `agentIdRegistry()`, `rewardToken()`, and `verifier()` on the game contract to cross-check the three dependencies. The registry implements `balanceOf(address)(uint256)` and `ownerOf(uint256)(address)`. Query `getProfile(address)` for registration, Agent ID ownership, the active game, and vCEO rewards. ERC-20 amounts use 18 decimals.

## Registration preview with Binance Agentic Wallet

For Binance AI, use the [wallet actions page](https://btceo.create-ai.cc{{walletActionsUrl}}) to copy a specific request for its built-in wallet. Where the chat supports external contract calls, ask for preview only.

Use the [official Binance Agentic Wallet Skill](https://github.com/binance/binance-skills-hub/blob/main/skills/binance-web3/binance-agentic-wallet/SKILL.md) and [external contract-call documentation](https://github.com/binance/binance-skills-hub/blob/main/skills/binance-web3/binance-agentic-wallet/references/external-sign.md). An installable client with the official wallet tools is required for Binance previews. The browser flow supports a player-controlled EVM wallet.

- Use the active Binance Agentic Wallet address for chain `{{chainId}}`. An existing registration can be read through `getProfile`.
- Check that `ownerOf(agentId)` equals the proposed sender. Enter the exact numeric token ID, a public nickname of 1–96 UTF-8 bytes without control characters, and the optional six-digit hexadecimal invite code as `bytes3`. Use `0x000000` for no inviter.
- Read `baw wallet settings --json` before preparing calldata. Developer Mode must be enabled and unexpired. The Binance App manages the setting. Keep all account login and signing inside Binance's official flow.
- The registration method is `register(uint256 agentId, string nickname, bytes3 inviterCode)`. It takes zero native value. Registration records the player and opens the first game in the same transaction.

After the read-only checks and with Developer Mode active, an ABI encoder such as `cast` can prepare the official preview. The uppercase shell variables below hold the verified addresses and user-provided arguments.

```sh
CALLDATA=$(cast calldata 'register(uint256,string,bytes3)' "$AGENT_ID" "$NICKNAME" "$INVITER_CODE")
baw contract-call preview --binanceChainId {{chainId}} --from "$PLAYER_ADDRESS" \
  --to "$GAME_ADDRESS" --value 0 --inputData "$CALLDATA" --json
```

Review the simulated transaction, `risks`, and any allowance or authority changes. An intercepted preview has no usable request ID. A successful preview only simulates the transaction. A user who later opts to broadcast must explicitly approve the exact preview through the official Binance flow.

For a confirmed registration, read `PlayerRegistered`, `RegistrationRewarded` if emitted, and `GameStarted` from the game contract's receipt. Use the emitted `gameId` for the first game. Read an existing session from `getProfile(player).activeGameId`.

## Play and claim in the browser

Use the [browser play and proof guide](https://btceo.create-ai.cc{{playGuideUrl}}) for turn-by-turn operation, proof progress, and downloading the result.

Open ranked mode, play the game, and let the browser generate its ZK proof. `startGame()` creates a new game when desired. The browser submits `claimVictory(uint256,uint8,uint32,bytes)` from the game owner's address, with the actual game ID, stance, score, and browser-generated proof. Confirm the vCEO amount from `VictoryClaimed` after the transaction succeeds. Binance Agentic Wallet claim previews remain outside this integration's tested scope.
