# File Type Enabler

File Type Enabler 是一款 Obsidian 桌面插件，用于在左侧的原生文件浏览器中显示 HTML、EPUB 和 XMind 文件。三个格式开关默认开启，可以单独切换，设置会保存到当前 Vault。

| 格式 | 扩展名 |
| --- | --- |
| HTML | `.html`、`.htm` |
| EPUB | `.epub` |
| XMind | `.xmind` |

扩展名匹配不区分大小写。Vault 根目录和子目录中的文件都可以显示，名称与扩展名标签由 Obsidian 渲染。插件只管理文件列表的显示。阅读、预览、编辑和格式转换可以交给系统应用或其他插件。

## 安装

最低客户端版本为 Obsidian 桌面版 **1.10.6**。

1. 在 [dist](dist/) 中选择版本 ZIP，将其中的 `obsidian-file-type-enabler` 文件夹解压到 `<Vault>/.obsidian/plugins/`。也可直接复制 `dist/obsidian-file-type-enabler/` 整个文件夹到该位置。
2. 打开 Obsidian 的 **设置 → 第三方插件**。如果列表里还没有 File Type Enabler，刷新已安装插件列表或重新打开 Vault。
3. 在已安装插件中启用 **File Type Enabler**。

## 使用与设置

将文件放在 Vault 根目录或任意普通子目录。打开左侧 **文件浏览器**，展开所在文件夹即可看到文件。

在 **设置 → File Type Enabler** 中切换 **HTML**、**EPUB** 或 **XMind**。HTML 开关同时控制 `.html` 和 `.htm`。开启后立即列出对应文件，关闭后从目录列表隐藏，再次开启即可恢复。Obsidian 对新增、移动、重命名和删除的文件继续使用原生文件监听。

## 实现和已知限制

- **Vault 识别** · 已验证的客户端会将普通目录中的这四种扩展名载入 Vault，即使 Obsidian 的 **显示所有文件类型** 已关闭。插件直接使用现有文件条目，磁盘上的原始文件由 Obsidian 和用户管理。[Vault 开发文档](https://docs.obsidian.md/Plugins/Vault)
- **目录显示** · 公开接口 `registerExtensions()` 注册的是扩展名与打开视图的映射。按扩展名控制原生文件浏览器的显示需要使用内部接口。插件只在各文件浏览器实例上扩展条目的可见性判定，借助原生的排序刷新和标签渲染。禁用插件时会恢复原生目录规则。[Obsidian API 类型定义](https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts)
- **兼容范围** · 已在 Windows 的 Obsidian 1.10.6 和 1.15.1 验证。macOS 和 Linux 桌面版尚未实测。Obsidian 升级或其他插件同时改动文件浏览器的内部逻辑时，兼容层可能需要调整。
- **隐藏范围** · 开关只控制左侧文件浏览器。Vault 隐藏目录仍遵循 Obsidian 的规则。全局 **显示所有文件类型** 继续控制其他扩展名以及 Obsidian 的其他界面。[Obsidian 设置说明](https://obsidian.md/help/settings#Show+all+file+types)

## 常见问题

**列表里找不到文件怎么办？**

确认已启用核心插件 **文件浏览器** 和第三方插件 **File Type Enabler**，对应格式已开启，然后展开文件所在目录。若 Obsidian 更新后显示兼容性提示，可以先停用 File Type Enabler，使用 **设置 → 文件与链接 → 显示所有文件类型** 查看这些文件。该全局开关会同时显示其他扩展名。

**怎样阅读或编辑文件？**

通过文件的右键菜单在系统文件管理器中定位，再用相应的应用打开。Obsidian 内已有的文件打开方式仍按原生设置和已安装的视图插件处理。

**切换开关会删除文件吗？**

开关只改变列表显示。插件使用 Obsidian 的 `loadData()` 和 `saveData()` 读取并保存自己的设置。

## 工程结构

| 位置 | 内容 |
| --- | --- |
| `src/` | 插件的 TypeScript 源码 |
| `manifest.json`、`styles.css` | 插件元数据和样式源文件 |
| `scripts/`、`esbuild.config.mjs` | 发布脚本和构建入口 |
| `dist/obsidian-file-type-enabler/` | 最新版本的解压安装目录 |
| `dist/obsidian-file-type-enabler-v<版本>.zip` | 按版本管理的安装包 |
| `prompt/` | 项目原始需求 |
| `wiki_memory/` | 工程记忆和交接索引 |

## 开发与发布

使用 Node.js 18 或更高版本和 npm。在项目目录执行以下命令。

```sh
npm ci
npm run build
```

`npm run build` 先执行类型检查，再同时更新解压目录和当前版本 ZIP。每个 ZIP 内含可直接安装的插件目录，保存已发布版本的 ZIP 即可回装对应版本。

`npm run dev` 监听 TypeScript 源码并输出到 `.dev/obsidian-file-type-enabler/`。每次启动时复制插件元数据和样式，修改这两项后重启开发构建即可同步到开发目录。

发布新版本时，用 `npm version <版本> --no-git-tag-version` 更新 npm 版本和锁文件，并同步修改根目录 `manifest.json` 的 `version`。运行 `npm run build`，核对解压目录和版本 ZIP，再将代码与两份产物一同提交并推送。工程内的交接和日常维护流程见 [工程记忆](wiki_memory/README.md)。

客户端回归覆盖首次安装、三个开关关闭和重新开启、重载后恢复配置、根目录和多级子目录、中文与特殊字符、文件新增和删除、移动和更换扩展名，以及 Markdown、图片和 PDF 的显示。验证使用单独的测试 Vault。
