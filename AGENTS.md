# File Type Enabler 开发约定

## Git 交付

- 项目远程为 [DewMysimple/File-Type-Enabler](https://github.com/DewMysimple/File-Type-Enabler.git)，主分支为 `main`。开始修改前检查工作区、当前分支和上游，保留其他任务的未提交改动。
- 每次产生工程修改的完整对话，收尾时验证改动、同步相关工程记忆、提交本轮修改并推送到该远程仓库。以 `git rev-parse HEAD` 与 `git ls-remote origin refs/heads/<分支>` 的提交一致为推送验收依据。
- 上游有新提交时，先核对差异再整合。推送受阻时保留本地提交并记录失败原因和恢复位置。

## 构建与发布

- 在 `src/` 修改插件源码，以根目录的 `manifest.json` 和 `styles.css` 作为安装文件来源。
- 每次开发新版本，同步 `manifest.json`、`package.json` 和 `package-lock.json` 中的版本，执行 `npm run build`。提交 `dist/obsidian-file-type-enabler/` 下可直接安装的最新插件文件，并提交 `dist/obsidian-file-type-enabler-v<版本>.zip`。按版本保留已发布的 ZIP。

<!-- wiki-memory:start -->
## 工程记忆

本项目使用工程根目录下的 `wiki_memory/`。新会话读取 `wiki_memory/AGENTS.md` 和 `wiki_memory/README.md`。按协议区分只读窄查询与修改、接续等任务，后者先读取规定的当前状态与全局约束。已读且未变的内容可复用。
在已授权开发任务完成或中断时，按协议同步有证据的状态、验证和恢复下一步；只读任务遵守只读范围。
日常读取、同步和交接直接遵循项目协议，不调用 wiki-memory Skill。仅用户明确要求配置、迁移、体检等记忆管理时加载 Skill；检查频率按项目协议，不把完整验收用于每轮收尾。
<!-- wiki-memory:end -->
