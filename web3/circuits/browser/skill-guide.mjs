export const skillGuideUrl = '/docs/skill-guide.md';
export const skillInstallCommand = 'npx skills add https://btceo.create-ai.cc --skill back-to-ceo';
export const skillPlayPrompt = '使用 back-to-ceo Skill，在当前浏览器链上牌局代玩一局。通关后等待 ZK 证明生成并下载，在领奖前停下。需要钱包操作时交给我确认。';

export function bindSkillGuide(trigger) {
  const dialog = document.createElement('dialog');
  dialog.id = 'agent-skill-guide';
  dialog.className = 'modal share-modal skill-guide-modal';
  dialog.setAttribute('aria-labelledby', 'agent-skill-guide-title');
  dialog.innerHTML = `
    <div class="modal-header"><h2 id="agent-skill-guide-title">安装与使用 Back To CEO Skill</h2></div>
    <div class="modal-body">
      <section>
        <h3>安装 Skill</h3>
        <p>在支持 Agent Skills 的客户端项目目录打开终端，运行以下命令，并选择你使用的客户端。</p>
        <pre><code id="agent-skill-install-command"></code></pre>
        <button class="btn-top" type="button" data-copy="agent-skill-install-command">复制安装命令</button>
      </section>
      <section>
        <h3>让 AI 代玩</h3>
        <p>让 AI 使用能操作网页的浏览器。用持有 Agent ID 的钱包进入链上牌局，再把下方指令发给 AI。连接、注册、开局和领奖时由你确认钱包请求。</p>
        <pre><code id="agent-skill-play-prompt"></code></pre>
        <button class="btn-top" type="button" data-copy="agent-skill-play-prompt">复制代玩指令</button>
      </section>
      <nav aria-label="Skill 文档">
        <a href="${skillGuideUrl}" target="_blank" rel="noopener">完整使用手册</a>
        <a href="/skills/back-to-ceo/SKILL.md" target="_blank" rel="noopener">Skill 原文</a>
        <a href="/game-rules.html" target="_blank" rel="noopener">游戏规则</a>
      </nav>
      <p class="hint-text" role="status"></p>
    </div>
    <form method="dialog" class="modal-footer"><button class="btn-save btn-secondary" autofocus>关闭</button></form>`;
  document.body.append(dialog);
  const copyStatus = dialog.querySelector('[role="status"]');
  dialog.querySelector('#agent-skill-install-command').textContent = skillInstallCommand;
  dialog.querySelector('#agent-skill-play-prompt').textContent = skillPlayPrompt;

  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-controls', dialog.id);
  trigger.addEventListener('click', () => {
    copyStatus.textContent = '';
    dialog.showModal();
  });
  for (const button of dialog.querySelectorAll('[data-copy]')) {
    const source = dialog.querySelector(`#${button.dataset.copy}`);
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(source.textContent);
        copyStatus.textContent = '已复制。';
      } catch {
        const selection = window.getSelection();
        selection.selectAllChildren(source);
        copyStatus.textContent = '请手动复制已选中的文字。';
      }
    });
  }
}
