# Back To CEO Skill 安装与使用手册

Back To CEO Skill 可查询 BNB Smart Chain 主网（链 ID {{chainId}}）的 Agent ID 和玩家资料，在交互式浏览器中代玩排位，通关后等待浏览器生成并下载 ZK 证明。

## 安装

在支持 Agent Skills 的客户端对应项目目录打开终端。确保终端可运行 Node.js 和 `npx`，然后执行命令并选择你使用的客户端。安装完成后，在该项目的 AI 对话中点名使用 `back-to-ceo`。

```bash
{{skillInstallCommand}}
```

可以把 [Skill 原文](https://btceo.create-ai.cc{{skillUrl}}) 直接发给能读取公开网页的 AI。自动发现入口是 [Agent Skills 索引](https://btceo.create-ai.cc/.well-known/agent-skills/index.json)。兼容的客户端可从首页的 `Link` 元数据、[`llms.txt`](https://btceo.create-ai.cc/llms.txt) 或 [部署 JSON](https://btceo.create-ai.cc/agent-config.json) 找到本手册。安装命令选项见 [Skills CLI 文档](https://github.com/vercel-labs/skills/blob/main/docs/commands.md#skills-add)。

## 指令示例

> {{skillPlayPrompt}}

> 核对我的公开钱包地址是否拥有 Binance Agent ID，并查询现有的链上牌局和 vCEO 凭证余额。

> 使用官方 Binance Agentic Wallet Skill 预览首次注册，只到预览为止。

## 浏览器代玩与钱包操作

1. 用 AI 能操作的浏览器打开[链上模式](https://btceo.create-ai.cc/?mode=chain)。使用持有 Agent ID 的钱包连接 BNB Smart Chain 主网。首次注册成功会同时创建首局，已注册的玩家可直接进入当前链上牌局。
2. AI 根据每一步更新后的牌面操作。通关后保持页面开启，等出现「证明已就绪」再下载 `browser-proof.json`。实际控件、操作顺序和失败状态见[代玩与证明指南](https://btceo.create-ai.cc{{playGuideUrl}})，牌效和胜负条件见[游戏规则](https://btceo.create-ai.cc/game-rules.html)。
3. 连接、注册、另开一局以及提交领奖都由玩家在钱包中确认。只需证明时，到下载完成即可。确认领奖后以链上 `VictoryClaimed` 回执为准。

只有文本或网页阅读能力的客户端可读取规则和公开链上资料，协助玩家判断下一步。实际代玩需要浏览器控制能力。通过 Agentic Wallet 预览注册时，需要客户端具备官方 `baw` 工具以及已启用且未过期的 Developer Mode。请在币安官方流程中完成钱包登录和确认。合约地址、ABI 和预览参数见[链上文档](https://btceo.create-ai.cc{{docsUrl}})及[币安官方 Agentic Wallet Skill](https://github.com/binance/binance-skills-hub/blob/main/skills/binance-web3/binance-agentic-wallet/SKILL.md)。
