# Play Back To CEO and generate a ZK proof

Use the [live browser game](https://btceo.create-ai.cc/?mode=chain), the [game rules](https://btceo.create-ai.cc/game-rules.html), and the [BNB Smart Chain deployment guide](https://btceo.create-ai.cc/docs/onchain.md). Gameplay and proof generation require an interactive browser. In a text-only client, give the player the game link and guide their moves from the board state they share.

## Start or enter a ranked game

1. Select a language if prompted. Use the wallet button in the main toolbar (`#btn-connect-wallet`), or use `连接钱包进入链上模式` from the first-visit nickname dialog. An unconnected player authorizes their browser wallet on BNB Smart Chain mainnet (chain ID {{chainId}}). Check the full connected address in the title of `#agent-wallet-status` and check Agent ID eligibility. Stop at the Agent ID prompt if the wallet lacks the required NFT.
2. First-time players register with the numeric Agent ID, public nickname, and optional invite code. After the player's wallet confirms registration, select `进入首局` in the success dialog. If registration already succeeded through the official Binance wallet flow, let the browser load the existing game. An existing game ID starts or replays the board using the same seed. A refresh does not restore the moves already played.
3. For a registered player with an active game, let the browser enter it automatically. If there is no active game, `新开链上牌局` (`#btn-proof-new-game`) requests a wallet transaction. Pause for the player to authorize it. Starting a new game while another is active replaces that game ID.

An Agentic Wallet CLI session alone does not make a wallet available to the page. Use the official Binance Skill for supported wallet previews. The player needs a compatible browser wallet that can connect with the game owner's address to use the ranked page.

## Choose and play moves

Read the currently rendered board and hand each time. The IDs below are independent of the display language.

| Read or act | Browser control |
| --- | --- |
| Stage objective and turn | `#stage-win-rule`, `#stage-badge`, `#turn-display` |
| Player and opponent seat counts, locks, and opponent passive | `#player-votes`, `#enemy-votes`, `#player-lock-progress`, `#enemy-lock-progress`, `#boss-passive[data-tooltip]` and `#seats-row .seat-node` |
| Cash, influence, and action points | `#stat-cash`, `#stat-inf`, `#stat-ap` |
| Play a card | Click the current card in `#hand-cards .hs-card.playable`. Read `.hs-card-title`, `.hs-card-desc`, and `.card-costs` on each card. |
| Exchange a card | Click `#btn-mulligan`, then click the current card to discard and draw a replacement. This uses the turn's exchange. |
| Hero powers | Use enabled controls `#btn-hero-jacket` (influence and draw), `#btn-hero-equity` (lock a player seat), and `#btn-hero-rally` (take a seat for influence). Read their tooltips for current costs. |
| End the turn | Click `#btn-end-turn` after using the moves you want. The opponent plays automatically. |

Take one legal action at a time. Wait for `#btn-end-turn` to become enabled again or the stage result `#modal-end` to appear. Then reread the board and hand before choosing a move. Cards and powers choose their targets automatically. Aim for five locked seats for an early win, or hold at least five seats through the final opponent turn. Take and protect seats before the opponent reaches five locked seats. Reserve action points for seat-changing cards and prioritize locking a seat the opponent could retake.

On a stage clear, click `#btn-play-again[data-keep="1"]` (the next-stage button) to continue the same ranked game. After a loss, stop and report the stage. Start another game only if the player requests it. The circuit supports up to 96 recorded actions across the three stages. Each card play, card exchange, power, and end turn counts as one.

## Finish the proof and optionally claim

1. After beating the third stage, leave the active game tab open. The browser generates proof segments as you play and automatically finishes the remaining work on victory. Wait for the `正在生成通关证明` progress dialog to close and for `#end-ranked-status` to show `证明已就绪`. A stalled progress update calls for continued waiting while the worker runs. A `证明失败` status means no usable proof was generated. Report the displayed error.
2. If the player wants the proof file, use the `下载证明` link (`a[download="browser-proof.json"]`). The JSON contains `segments` with proof bytes and public inputs and the intermediate `commitments`. The proof is tied to this game ID and wallet. A ready or downloaded proof is a browser result. The on-chain claim verifies it.
3. When the player also requests the vCEO claim, show the verified game contract `{{gameAddress}}`, the game ID, the wallet, and the zero-BNB `claimVictory` call. Gas can apply. Use the game's `钱包确认领奖` button (`#btn-proof-claim`) after the player agrees to proceed. The player reviews and confirms the wallet request. Keep the tab open if they decline and still want the proof. Distinguish a pending transaction from a successful `VictoryClaimed` receipt, which provides the actual vCEO award.
