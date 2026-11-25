"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => FileTypeEnablerPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian3 = require("obsidian");

// src/fileExplorer.ts
var import_obsidian = require("obsidian");

// src/settings.ts
var FILE_FORMATS = [
  { id: "html", name: "HTML", extensions: ["html", "htm"] },
  { id: "epub", name: "EPUB", extensions: ["epub"] },
  { id: "xmind", name: "XMind", extensions: ["xmind"] }
];
var DEFAULT_SETTINGS = { html: true, epub: true, xmind: true };
var formatByExtension = /* @__PURE__ */ new Map();
for (const { id, extensions } of FILE_FORMATS) {
  for (const extension of extensions) {
    formatByExtension.set(extension, id);
  }
}
function getFormat(extension) {
  return formatByExtension.get(extension.toLowerCase());
}
function readSettings(data) {
  const settings = { ...DEFAULT_SETTINGS };
  if (!data || typeof data !== "object") return settings;
  const saved = data;
  for (const { id } of FILE_FORMATS) {
    const value = saved[id];
    if (typeof value === "boolean") settings[id] = value;
  }
  return settings;
}

// src/fileExplorer.ts
var EXPLORER_VIEW_TYPE = "file-explorer";
function isExplorerView(view) {
  const candidate = view;
  return !!candidate.fileItems && typeof candidate.fileItems === "object" && typeof candidate.getSortedFolderItems === "function" && typeof candidate.requestSort === "function";
}
function replaceMethod(target, key, replacement) {
  const descriptor = Object.getOwnPropertyDescriptor(target, key);
  target[key] = replacement;
  return () => {
    if (target[key] !== replacement) return;
    if (descriptor) Object.defineProperty(target, key, descriptor);
    else Reflect.deleteProperty(target, key);
  };
}
function deselectHiddenItem(tree, item) {
  if (!tree) return;
  tree.deselectItem?.(item);
  if (tree.focusedItem === item) tree.setFocusedItem?.(null, false);
  if (tree.activeDom === item) tree.activeDom = null;
}
function getFileFormat(file) {
  return file instanceof import_obsidian.TFile ? getFormat(file.extension) : void 0;
}
function attachExplorerFilter(view, isEnabled, reportError) {
  if (!isExplorerView(view)) return null;
  let active = true;
  const restoreItems = /* @__PURE__ */ new WeakMap();
  const getSortedFolderItems = view.getSortedFolderItems;
  const markSupported = (item) => {
    if (restoreItems.has(item)) return;
    const isSupported = item.isSupported;
    if (typeof isSupported !== "function" || typeof item.updateTitle !== "function") {
      reportError(new Error("File explorer item API unavailable"));
      return;
    }
    let restore;
    try {
      restore = replaceMethod(item, "isSupported", function() {
        return active && getFileFormat(this.file) !== void 0 || isSupported.call(this);
      });
      item.updateTitle();
      view.tree?.infinityScroll?.invalidate?.(item);
      restoreItems.set(item, restore);
    } catch (error) {
      restore?.();
      reportError(error);
    }
  };
  const restoreSort = replaceMethod(view, "getSortedFolderItems", function(folder) {
    const items = getSortedFolderItems.call(this, folder);
    if (!active) return items;
    if (!Array.isArray(items)) {
      reportError(new Error("Unexpected file explorer folder listing"));
      return items;
    }
    return items.filter((item) => {
      const format = getFileFormat(item?.file);
      if (!format) return true;
      if (!isEnabled(format)) {
        deselectHiddenItem(this.tree, item);
        return false;
      }
      markSupported(item);
      return true;
    });
  });
  let restoreReveal;
  const revealInFolder = view.revealInFolder;
  if (typeof revealInFolder === "function") {
    try {
      restoreReveal = replaceMethod(view, "revealInFolder", function(file) {
        const format = getFileFormat(file);
        if (active && format && !isEnabled(format)) return;
        revealInFolder.call(this, file);
      });
    } catch (error) {
      reportError(error);
    }
  }
  return {
    refresh: () => view.requestSort(),
    dispose() {
      active = false;
      restoreSort();
      restoreReveal?.();
      for (const item of Object.values(view.fileItems)) {
        const restore = restoreItems.get(item);
        if (!restore) continue;
        try {
          restore();
          item.updateTitle?.();
          view.tree?.infinityScroll?.invalidate?.(item);
          if (item.isSupported?.() === false) deselectHiddenItem(view.tree, item);
        } catch (error) {
          reportError(error);
        }
      }
      view.requestSort();
    }
  };
}

// src/settingsTab.ts
var import_obsidian2 = require("obsidian");
var FileTypeEnablerSettingTab = class extends import_obsidian2.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian2.Setting(containerEl).setName("\u6587\u4EF6\u683C\u5F0F\u652F\u6301").setHeading();
    for (const { id, name, extensions } of FILE_FORMATS) {
      new import_obsidian2.Setting(containerEl).setName(name).setDesc(extensions.map((extension) => "." + extension).join("\u3001")).addToggle((toggle) => toggle.setValue(this.plugin.isEnabled(id)).onChange((enabled) => this.plugin.setEnabled(id, enabled)));
    }
    new import_obsidian2.Setting(containerEl).setName("\u5173\u4E8E").setHeading();
    new import_obsidian2.Setting(containerEl).setName(this.plugin.manifest.name).setDesc("\u7248\u672C " + this.plugin.manifest.version + " \xB7 \u7BA1\u7406\u5DE6\u4FA7\u6587\u4EF6\u6D4F\u89C8\u5668\u4E2D\u7684\u989D\u5916\u6587\u4EF6\u683C\u5F0F\u3002");
  }
};

// src/main.ts
var FileTypeEnablerPlugin = class extends import_obsidian3.Plugin {
  constructor() {
    super(...arguments);
    this.settings = readSettings(null);
    this.saveQueue = Promise.resolve();
    this.explorers = /* @__PURE__ */ new Map();
    this.stopped = false;
    this.reportedCompatibilityIssue = false;
  }
  async onload() {
    try {
      this.settings = readSettings(await this.loadData());
    } catch (error) {
      console.warn("[File Type Enabler] Could not load settings", error);
      new import_obsidian3.Notice("File Type Enabler \u65E0\u6CD5\u8BFB\u53D6\u8BBE\u7F6E\uFF0C\u5DF2\u4F7F\u7528\u9ED8\u8BA4\u503C\u3002");
    }
    if (this.stopped) return;
    this.addSettingTab(new FileTypeEnablerSettingTab(this.app, this));
    const { workspace } = this.app;
    this.registerEvent(workspace.on("layout-change", () => this.syncExplorers()));
    workspace.onLayoutReady(() => this.syncExplorers());
  }
  onunload() {
    this.stopped = true;
    for (const explorer of this.explorers.values()) this.disposeExplorer(explorer);
    this.explorers.clear();
  }
  isEnabled(format) {
    return this.settings[format];
  }
  setEnabled(format, enabled) {
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
          new import_obsidian3.Notice("File Type Enabler \u65E0\u6CD5\u4FDD\u5B58\u8BBE\u7F6E\uFF0C\u91CD\u8F7D\u540E\u53EF\u80FD\u6062\u590D\u5230\u4E0A\u6B21\u4FDD\u5B58\u7684\u72B6\u6001\u3002");
        }
      }
    });
  }
  syncExplorers() {
    if (this.stopped) return;
    const views = new Set(this.app.workspace.getLeavesOfType(EXPLORER_VIEW_TYPE).filter((leaf) => !leaf.isDeferred).map((leaf) => leaf.view));
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
          (error) => this.reportCompatibilityIssue(error)
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
  refreshExplorer(explorer) {
    try {
      explorer.refresh();
    } catch (error) {
      this.reportCompatibilityIssue(error);
    }
  }
  disposeExplorer(explorer) {
    try {
      explorer.dispose();
    } catch (error) {
      console.warn("[File Type Enabler] Could not restore file explorer", error);
    }
  }
  reportCompatibilityIssue(error) {
    if (this.reportedCompatibilityIssue || this.stopped) return;
    this.reportedCompatibilityIssue = true;
    console.warn("[File Type Enabler] File explorer compatibility issue", error);
    new import_obsidian3.Notice("File Type Enabler \u65E0\u6CD5\u4E3A\u5F53\u524D\u6587\u4EF6\u6D4F\u89C8\u5668\u5E94\u7528\u90E8\u5206\u683C\u5F0F\u8BBE\u7F6E\u3002");
  }
};
