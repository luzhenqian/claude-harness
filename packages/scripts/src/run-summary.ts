import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { generateSourceSummary } from "./generate-source-summary.js";

const ROOT = resolve(import.meta.dirname, "../../..");
const SOURCE_DIR = resolve(ROOT, "packages/claude-code-source/src");
const OUTPUT_DIR = resolve(ROOT, "packages/web/generated");

async function main() {
  console.log("Generating source summary...");
  const summary = await generateSourceSummary(SOURCE_DIR);
  await writeFile(resolve(OUTPUT_DIR, "source-summary.json"), JSON.stringify(summary, null, 2));
  console.log(summary);
  console.log("Done!");
}

main();
