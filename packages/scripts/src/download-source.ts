// packages/scripts/src/download-source.ts
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { execSync, execFileSync } from "node:child_process";

const ROOT = resolve(import.meta.dirname, "../../..");
const SOURCE_DIR = resolve(ROOT, "packages/claude-code-source/src");

async function main() {
  // Skip if source already exists locally
  if (existsSync(SOURCE_DIR)) {
    console.log("Source directory already exists, skipping download.");
    return;
  }

  const url = process.env.SOURCE_RELEASE_URL;
  const token = process.env.GITHUB_TOKEN;

  if (!url) {
    console.error(
      "ERROR: packages/claude-code-source/src/ not found and SOURCE_RELEASE_URL is not set.\n" +
      "Either place source files locally or set SOURCE_RELEASE_URL and GITHUB_TOKEN env vars."
    );
    process.exit(1);
  }

  console.log("Downloading source archive...");

  const destDir = resolve(ROOT, "packages/claude-code-source");
  mkdirSync(destDir, { recursive: true });

  const tarball = resolve(destDir, "source.tar.gz");

  // Download using curl (available on all Vercel/CI environments)
  const curlArgs = [
    "-fSL",
    "-o", tarball,
    ...(token ? ["-H", `Authorization: Bearer ${token}`] : []),
    "-H", "Accept: application/octet-stream",
    url,
  ];

  execFileSync("curl", curlArgs, { stdio: "inherit" });

  console.log("Extracting archive...");
  mkdirSync(SOURCE_DIR, { recursive: true });
  execSync(`tar -xzf ${tarball} -C ${SOURCE_DIR}`, { stdio: "inherit" });

  // Clean up tarball
  execSync(`rm ${tarball}`);

  console.log("Source downloaded and extracted successfully.");
}

main().catch((err) => {
  console.error("Failed to download source:", err);
  process.exit(1);
});
