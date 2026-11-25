export const FILE_FORMATS = [
  { id: "html", name: "HTML", extensions: ["html", "htm"] },
  { id: "epub", name: "EPUB", extensions: ["epub"] },
  { id: "xmind", name: "XMind", extensions: ["xmind"] },
] as const;

export type FormatId = (typeof FILE_FORMATS)[number]["id"];
export type FileTypeSettings = Record<FormatId, boolean>;

const DEFAULT_SETTINGS: FileTypeSettings = { html: true, epub: true, xmind: true };
const formatByExtension = new Map<string, FormatId>();

for (const { id, extensions } of FILE_FORMATS) {
  for (const extension of extensions) {
    formatByExtension.set(extension, id);
  }
}

export function getFormat(extension: string): FormatId | undefined {
  return formatByExtension.get(extension.toLowerCase());
}

export function readSettings(data: unknown): FileTypeSettings {
  const settings = { ...DEFAULT_SETTINGS };
  if (!data || typeof data !== "object") return settings;

  const saved = data as Record<string, unknown>;
  for (const { id } of FILE_FORMATS) {
    const value = saved[id];
    if (typeof value === "boolean") settings[id] = value;
  }

  return settings;
}
