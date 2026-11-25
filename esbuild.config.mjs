import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build, context } from "esbuild";
import { writeRelease } from "./scripts/write-release.mjs";

const production = process.argv.includes("production");
const projectRoot = fileURLToPath(new URL("./", import.meta.url));
const manifestText = await readFile(join(projectRoot, "manifest.json"), "utf8");
const manifest = JSON.parse(manifestText);
const packageText = await readFile(join(projectRoot, "package.json"), "utf8");
const packageInfo = JSON.parse(packageText);

if (
  typeof manifest.id !== "string" ||
  !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(manifest.id) ||
  manifest.id !== packageInfo.name
) {
  throw new Error("manifest.json must contain a plugin ID matching package.json.");
}
if (
  typeof manifest.version !== "string" ||
  !/^\d+\.\d+\.\d+(?:-[\da-zA-Z.-]+)?(?:\+[\da-zA-Z.-]+)?$/.test(manifest.version) ||
  manifest.version !== packageInfo.version
) {
  throw new Error("manifest.json must contain a release version matching package.json.");
}

const outputRoot = join(projectRoot, production ? "dist" : ".dev");
const pluginDirectory = join(outputRoot, manifest.id);
const files = {
  "manifest.json": Buffer.from(manifestText.replace(/\r\n/g, "\n")),
  "styles.css": Buffer.from((await readFile(join(projectRoot, "styles.css"), "utf8")).replace(/\r\n/g, "\n")),
};
const options = {
  absWorkingDir: projectRoot,
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian"],
  format: "cjs",
  target: "es2020",
  outfile: join(pluginDirectory, "main.js"),
  sourcemap: production ? false : "inline",
  logLevel: "info",
};

if (production) {
  const { outputFiles } = await build({ ...options, write: false });
  await writeRelease(outputRoot, manifest, { "main.js": outputFiles[0].contents, ...files });
} else {
  await mkdir(pluginDirectory, { recursive: true });
  for (const [fileName, contents] of Object.entries(files)) {
    await writeFile(join(pluginDirectory, fileName), contents);
  }
  const buildContext = await context(options);
  await buildContext.watch();
}
