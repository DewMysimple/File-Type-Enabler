import { PluginSettingTab, Setting, type App } from "obsidian";
import type FileTypeEnablerPlugin from "./main";
import { FILE_FORMATS } from "./settings";

export class FileTypeEnablerSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: FileTypeEnablerPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName("文件格式支持").setHeading();
    for (const { id, name, extensions } of FILE_FORMATS) {
      new Setting(containerEl)
        .setName(name)
        .setDesc(extensions.map((extension) => "." + extension).join("、"))
        .addToggle((toggle) => toggle
          .setValue(this.plugin.isEnabled(id))
          .onChange((enabled) => this.plugin.setEnabled(id, enabled)));
    }

    new Setting(containerEl).setName("关于").setHeading();
    new Setting(containerEl)
      .setName(this.plugin.manifest.name)
      .setDesc("版本 " + this.plugin.manifest.version + " · 管理左侧文件浏览器中的额外文件格式。");
  }
}
