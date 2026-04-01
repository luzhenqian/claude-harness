import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export interface SourceSummary {
  totalFiles: number;
  totalLines: number;
  totalModules: number;
}

async function walkDir(dir: string): Promise<{ files: number; lines: number }> {
  let files = 0;
  let lines = 0;
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = await walkDir(fullPath);
      files += sub.files;
      lines += sub.lines;
    } else {
      files++;
      const content = await readFile(fullPath, "utf-8");
      lines += content.split("\n").length;
    }
  }

  return { files, lines };
}

export async function generateSourceSummary(sourceDir: string): Promise<SourceSummary> {
  const { files, lines } = await walkDir(sourceDir);

  // Count top-level directories as modules
  const entries = await readdir(sourceDir, { withFileTypes: true });
  const totalModules = entries.filter((e) => e.isDirectory()).length;

  return {
    totalFiles: files,
    totalLines: lines,
    totalModules,
  };
}
