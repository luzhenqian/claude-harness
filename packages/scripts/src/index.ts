import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { generateFileTree } from "./generate-file-tree.js";
import { generateModuleStats } from "./generate-module-stats.js";
import { generateSearchIndex } from "./generate-search-index.js";
import { generateSourceSummary } from "./generate-source-summary.js";

const ROOT = resolve(import.meta.dirname, "../../..");
const SOURCE_DIR = resolve(ROOT, "packages/claude-code-source/src");
const OUTPUT_DIR = resolve(ROOT, "packages/web/generated");

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  console.log("Generating file tree...");
  const tree = await generateFileTree(SOURCE_DIR);
  await writeFile(resolve(OUTPUT_DIR, "file-tree.json"), JSON.stringify(tree, null, 2));

  console.log("Generating module stats...");
  const stats = await generateModuleStats(SOURCE_DIR);
  await writeFile(resolve(OUTPUT_DIR, "module-stats.json"), JSON.stringify(stats, null, 2));

  console.log("Generating source summary...");
  const summary = await generateSourceSummary(SOURCE_DIR);
  await writeFile(resolve(OUTPUT_DIR, "source-summary.json"), JSON.stringify(summary, null, 2));

  console.log("Generating search index...");
  const searchIndex = await generateSearchIndex(SOURCE_DIR);
  await writeFile(resolve(OUTPUT_DIR, "search-index.json"), JSON.stringify(searchIndex));

  // Also write to web's public dir for client-side fetch
  const publicDir = resolve(ROOT, "packages/web/public");
  await mkdir(publicDir, { recursive: true });
  await writeFile(resolve(publicDir, "search-index.json"), JSON.stringify(searchIndex));

  console.log("Done! Output written to packages/web/generated/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
