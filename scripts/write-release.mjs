import { copyFile, mkdir, mkdtemp, rename, rm, rmdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { zipSync } from "fflate";

export async function writeRelease(distribution, { id, version }, files) {
  const archiveName = `${id}-v${version}.zip`;
  const entries = Object.entries(files);
  const archive = zipSync(
    Object.fromEntries(entries.map(([name, contents]) => [`${id}/${name}`, contents])),
    { mtime: new Date(1980, 0, 1) },
  );

  // Stage the complete release before replacing any published files.
  await mkdir(distribution, { recursive: true });
  const stage = await mkdtemp(join(distribution, ".release-"));
  const artifacts = [...entries, [archiveName, archive]];
  const installation = join(distribution, id);
  const previous = new Set();
  const installed = [];
  const backupPath = (name) => join(stage, name + ".previous");
  let keepStage = false;

  try {
    for (const [name, contents] of artifacts) {
      await writeFile(join(stage, name), contents);
    }
    await mkdir(installation, { recursive: true });
    for (const [name] of entries) {
      try {
        await copyFile(join(installation, name), backupPath(name));
        previous.add(name);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }

    for (const [name] of entries) {
      await rename(join(stage, name), join(installation, name));
      installed.push(name);
    }
    await rename(join(stage, archiveName), join(distribution, archiveName));
  } catch (error) {
    const errors = [error];
    for (const name of installed.reverse()) {
      const target = join(installation, name);
      try {
        if (previous.has(name)) await rename(backupPath(name), target);
        else await rm(target, { force: true });
      } catch (rollbackError) {
        errors.push(rollbackError);
      }
    }
    if (errors.length > 1) {
      keepStage = true;
      throw new AggregateError(errors, "Release rollback failed. Recovery files are in " + stage);
    }
    throw error;
  } finally {
    if (!keepStage) {
      for (const [name] of artifacts) {
        await rm(join(stage, name), { force: true });
      }
      for (const [name] of entries) {
        await rm(backupPath(name), { force: true });
      }
      await rmdir(stage);
    }
  }

  console.log(`Install folder: dist/${id}/\nInstall archive: dist/${archiveName}`);
}
