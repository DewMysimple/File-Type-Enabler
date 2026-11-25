import { Notice, Plugin, type View } from "obsidian";
import { attachExplorerFilter, EXPLORER_VIEW_TYPE, type ExplorerFilter } from "./fileExplorer";
import { readSettings, type FormatId } from "./settings";
import { FileTypeEnablerSettingTab } from "./settingsTab";

export default class FileTypeEnablerPlugin extends Plugin {
  private settings = readSettings(null);
  private saveQueue = Promise.resolve();
  private readonly explorers = new Map<View, ExplorerFilter>();
  private stopped = false;
  private reportedCompatibilityIssue = false;

  async onload(): Promise<void> {
    try {
      this.settings = readSettings(await this.loadData());
    } catch (error) {
      console.warn("[File Type Enabler] Could not load settings", error);
      new Notice("File Type Enabler 无法读取设置，已使用默认值。");
    }
    if (this.stopped) return;

    this.addSettingTab(new FileTypeEnablerSettingTab(this.app, this));
    const { workspace } = this.app;
    this.registerEvent(workspace.on("layout-change", () => this.syncExplorers()));
    workspace.onLayoutReady(() => this.syncExplorers());
  }

  onunload(): void {
    this.stopped = true;
    for (const explorer of this.explorers.values()) this.disposeExplorer(explorer);
    this.explorers.clear();
  }

  isEnabled(format: FormatId): boolean {
    return this.settings[format];
  }

  setEnabled(format: FormatId, enabled: boolean): void {
    if (this.stopped || this.settings[format] === enabled) return;

    const settings = { ...this.settings, [format]: enabled };
    this.settings = settings;
    this.syncExplorers();
    for (const explorer of this.explorers.values()) this.refreshExplorer(explorer);

    this.saveQueue = this.saveQueue.then(async () => {
      try {
        await this.saveData(settings);
      } catch (error) {
        console.error("[File Type Enabler] Could not save settings", error);
        if (!this.stopped && this.settings === settings) {
          new Notice("File Type Enabler 无法保存设置，重载后可能恢复到上次保存的状态。");
        }
      }
    });
  }

  private syncExplorers(): void {
    if (this.stopped) return;
    const views = new Set(this.app.workspace.getLeavesOfType(EXPLORER_VIEW_TYPE)
      .filter((leaf) => !leaf.isDeferred)
      .map((leaf) => leaf.view));

    for (const [view, explorer] of this.explorers) {
      if (views.has(view)) continue;
      this.disposeExplorer(explorer);
      this.explorers.delete(view);
    }

    for (const view of views) {
      if (this.explorers.has(view)) continue;

      try {
        const explorer = attachExplorerFilter(
          view,
          (format) => this.isEnabled(format),
          (error) => this.reportCompatibilityIssue(error),
        );
        if (explorer) {
          this.explorers.set(view, explorer);
          this.refreshExplorer(explorer);
        } else {
          this.reportCompatibilityIssue(new Error("File explorer view API unavailable"));
        }
      } catch (error) {
        this.reportCompatibilityIssue(error);
      }
    }
  }

  private refreshExplorer(explorer: ExplorerFilter): void {
    try {
      explorer.refresh();
    } catch (error) {
      this.reportCompatibilityIssue(error);
    }
  }

  private disposeExplorer(explorer: ExplorerFilter): void {
    try {
      explorer.dispose();
    } catch (error) {
      console.warn("[File Type Enabler] Could not restore file explorer", error);
    }
  }

  private reportCompatibilityIssue(error: unknown): void {
    if (this.reportedCompatibilityIssue || this.stopped) return;
    this.reportedCompatibilityIssue = true;
    console.warn("[File Type Enabler] File explorer compatibility issue", error);
    new Notice("File Type Enabler 无法为当前文件浏览器应用部分格式设置。");
  }
}
