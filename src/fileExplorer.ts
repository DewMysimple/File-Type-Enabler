import { TFile, type TAbstractFile, type TFolder, type View } from "obsidian";
import { getFormat, type FormatId } from "./settings";

export const EXPLORER_VIEW_TYPE = "file-explorer";

interface ExplorerItem {
  file: TAbstractFile;
  isSupported?(): boolean;
  updateTitle?(): void;
}

interface ExplorerTree {
  focusedItem?: ExplorerItem | null;
  activeDom?: ExplorerItem | null;
  infinityScroll?: { invalidate?(item: ExplorerItem): void };
  deselectItem?(item: ExplorerItem): void;
  setFocusedItem?(item: null, focus: boolean): void;
}

interface ExplorerView extends View {
  fileItems: Record<string, ExplorerItem>;
  tree?: ExplorerTree;
  getSortedFolderItems(folder: TFolder): ExplorerItem[];
  requestSort(): void;
  revealInFolder?(file: TAbstractFile): void;
}

export interface ExplorerFilter {
  refresh(): void;
  dispose(): void;
}

function isExplorerView(view: View): view is ExplorerView {
  const candidate = view as Partial<ExplorerView>;
  return !!candidate.fileItems && typeof candidate.fileItems === "object"
    && typeof candidate.getSortedFolderItems === "function"
    && typeof candidate.requestSort === "function";
}

function replaceMethod<T extends object, K extends keyof T>(
  target: T, key: K, replacement: T[K],
): () => void {
  const descriptor = Object.getOwnPropertyDescriptor(target, key);
  target[key] = replacement;

  return () => {
    // A plugin that wrapped our method later can keep its wrapper intact.
    if (target[key] !== replacement) return;
    if (descriptor) Object.defineProperty(target, key, descriptor);
    else Reflect.deleteProperty(target, key);
  };
}

function deselectHiddenItem(tree: ExplorerTree | undefined, item: ExplorerItem): void {
  if (!tree) return;
  tree.deselectItem?.(item);
  if (tree.focusedItem === item) tree.setFocusedItem?.(null, false);
  if (tree.activeDom === item) tree.activeDom = null;
}

function getFileFormat(file: TAbstractFile | undefined): FormatId | undefined {
  return file instanceof TFile ? getFormat(file.extension) : undefined;
}

// Obsidian already indexes these files. Apply visibility settings to each
// native Explorer instance using its existing rows.
export function attachExplorerFilter(
  view: View,
  isEnabled: (format: FormatId) => boolean,
  reportError: (error: unknown) => void,
): ExplorerFilter | null {
  if (!isExplorerView(view)) return null;

  let active = true;
  const restoreItems = new WeakMap<ExplorerItem, () => void>();
  const getSortedFolderItems = view.getSortedFolderItems;

  const markSupported = (item: ExplorerItem): void => {
    if (restoreItems.has(item)) return;
    const isSupported = item.isSupported;
    if (typeof isSupported !== "function" || typeof item.updateTitle !== "function") {
      reportError(new Error("File explorer item API unavailable"));
      return;
    }

    let restore: (() => void) | undefined;
    try {
      restore = replaceMethod(item, "isSupported", function (this: ExplorerItem) {
        return (active && getFileFormat(this.file) !== undefined) || isSupported.call(this);
      });
      item.updateTitle();
      view.tree?.infinityScroll?.invalidate?.(item);
      restoreItems.set(item, restore);
    } catch (error) {
      restore?.();
      reportError(error);
    }
  };

  const restoreSort = replaceMethod(view, "getSortedFolderItems", function (
    this: ExplorerView, folder: TFolder,
  ) {
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

  let restoreReveal: (() => void) | undefined;
  const revealInFolder = view.revealInFolder;
  if (typeof revealInFolder === "function") {
    try {
      restoreReveal = replaceMethod(view, "revealInFolder", function (this: ExplorerView, file) {
        const format = getFileFormat(file);
        // The native reveal command can focus a file outside the filtered tree.
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
    },
  };
}
