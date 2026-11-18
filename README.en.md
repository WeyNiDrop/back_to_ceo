# Back To CEO · Road to the Top

[简体中文](README.md) · **English**

A single-player strategy card game about taking control of a board of directors. Play as former CEO Gesen Yellow, start with zero seats, and win three battles in a row to take back the board.

[Play online](https://btceo.create-ai.cc/) · [Detailed rules and developer docs (Chinese)](PROJECT_DOC.md) · [MIT License](LICENSE)

## Project purpose

Set in a fictional boardroom power struggle, the game turns public relations, financing, and alliances between directors into card mechanics. Each round, decide whether to claim another seat, lock a seat you hold, or save cash and influence for later. The source is open for players and developers who want to study the game, rebalance the cards, or extend the opponent strategies.

The game also expresses support for Jensen Huang’s return as NVIDIA CEO through its sharing text and an external campaign link. [Stand with Jensen](https://standwithjensen.com/)

## How to play

Each run randomly selects three of the 11 bosses to fight in sequence. Every stage has nine board seats and lasts up to six rounds. On your first visit, choose Simplified Chinese or English to see the tutorial.

### Win conditions

| Situation | Result |
| --- | --- |
| Instant win in Stage 1 | Control at least 6 seats |
| Instant win in Stages 2 and 3 | Control at least 7 seats |
| Win by locking seats in any stage | Lock at least 5 of your seats |
| End of Round 6 | Advance if you still control at least 5 seats after the opponent acts |
| Early defeat | The opponent locks 5 seats first |

Win all three stages to clear the game. Your run ends if you fall short of the seat requirement after Round 6 or if the opponent locks a majority first.

### Your turn and the opponent's response

1. **Manage your hand.** Draw four cards at the start of each stage. The 21-card deck contains 19 distinct cards across the Energy, Influence, Espionage, and Politics categories. Select a card to play it and pay its energy, cash, or influence cost. Modifiers can change costs or effects.
2. **Control the board.** Cards and powers can claim neutral seats, steal unlocked enemy seats, or protect seats you already hold. Locked seats count toward your total and are protected against theft and effects that turn them neutral.
3. **Anticipate the counter.** After you choose **End Turn**, the opponent normally plays as many cards as you played that round, with a minimum of two, then resolves their passive. Some cards reduce the opponent's plays or suppress their round-end passive. Select the passive's name on the board to see how it works.
4. **Carry momentum into the next round.** You can swap one card per round. Each new round refills energy and draws up to two cards, with a five-card hand limit. When you win a stage, you carry some cash and influence forward, get a fresh hand, and regain your power uses.

### Hero powers

Each active power can be used twice per stage and once per round.

| Power | Effect |
| --- | --- |
| Jacket Stream | Spend 2 energy to gain 20 influence and draw one card |
| Equity Lock | Spend 1 energy to permanently lock one of your unlocked seats |
| Public Rally | Spend 15 influence to claim a neutral seat, or steal an unlocked enemy seat if no neutral seats remain |
| Leather Jacket (passive) | Gain 5 extra influence on your first Influence card each round |

## Architecture

Back To CEO uses plain HTML, CSS, and JavaScript. The browser runs the game state, rendering, opponent strategy, and sound. Cloudflare Pages serves the production site as static files.

| Module | Responsibility |
| --- | --- |
| [`index.html`](index.html), [`style.css`](style.css) | Board, hand, first-visit tutorial, results, sharing dialogs, and responsive layout |
| [`game.js`](game.js) | Cards, resources, action resolution, stage progression, and X share links |
| [`ai.js`](ai.js) | Seat setup, boss passives, built-in opponent strategies, and optional model-driven opponents |
| [`i18n.js`](i18n.js) | Simplified Chinese and English translations, language selection, and cash formatting |
| [`sound.js`](sound.js) | Synthesized game sounds using the Web Audio API |
| [`assets/`](assets/) | Character portraits, card and ending illustrations, fonts, and share poster |
| [`scripts/`](scripts/) | Packages static files and prepares canonical URLs and link-preview metadata |

The built-in opponent runs in the browser and is ready to play. **Opponent Settings** also accepts OpenAI Chat Completions-compatible endpoints. The browser remembers your language, whether you’ve seen the tutorial, and your opponent settings. When you use a custom model, the browser sends requests and the API key to the endpoint you configured.

## Local development and deployment

Clone the repository and start a static server, then [open the game locally](http://127.0.0.1:8080/).

```sh
git clone https://github.com/WeyNiDrop/back_to_ceo.git
cd back_to_ceo
python3 -m http.server 8080 --bind 127.0.0.1
```

Use Node.js 22 to build the deployment files.

```sh
node scripts/build-frontend.mjs
```

Cloudflare Pages uses that build command on the `main` branch of the GitHub repository and publishes `dist/`. Production builds include the live domain in the sharing metadata. Set `PUBLIC_SITE_URL` at build time to use your own public URL. [Deployment notes (Chinese)](PROJECT_DOC.md#10-前端部署)

## License

The project is released under the [MIT License](LICENSE). Third-party fonts are covered by their respective SIL Open Font License 1.1 terms. [Art assets and font licenses (Chinese)](assets/README.md)
