# Remove Claude Code Source from GitHub — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `packages/claude-code-source/` from GitHub while keeping the website functional by downloading source from a private GitHub Release at build time.

**Architecture:** Add a download script that fetches a `.tar.gz` archive from a private GitHub Release before the generate step. The script skips download if source files already exist locally. Vercel uses `GITHUB_TOKEN` and `SOURCE_RELEASE_URL` environment variables.

**Tech Stack:** Node.js (native `https`/`fs`), GitHub Releases API, Vercel environment variables

---

### Task 1: Create the download script

**Files:**
- Create: `packages/scripts/src/download-source.ts`

- [ ] **Step 1: Create the download script**

```typescript
// packages/scripts/src/download-source.ts
import { existsSync, mkdirSync, createWriteStream } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

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
    "curl", "-fSL",
    "-o", tarball,
    ...(token ? ["-H", `Authorization: token ${token}`] : []),
    "-H", "Accept: application/octet-stream",
    url,
  ];

  execSync(curlArgs.join(" "), { stdio: "inherit" });

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
```

- [ ] **Step 2: Add download script to scripts package.json**

In `packages/scripts/package.json`, add to `"scripts"`:

```json
"download": "tsx src/download-source.ts"
```

- [ ] **Step 3: Commit**

```bash
git add packages/scripts/src/download-source.ts packages/scripts/package.json
git commit -m "feat: add download script for source archive from private GitHub Release"
```

---

### Task 2: Update Vercel build command

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Update buildCommand to run download before generate**

Change `vercel.json` to:

```json
{
  "framework": "nextjs",
  "installCommand": "npm install --legacy-peer-deps && cd packages/scripts && npm install --legacy-peer-deps && cd ../web && npm install --legacy-peer-deps",
  "buildCommand": "cd packages/scripts && npx tsx src/download-source.ts && npx tsx src/index.ts && cd ../web && npm run build",
  "outputDirectory": "packages/web/.next"
}
```

The only change is adding `npx tsx src/download-source.ts &&` before the existing generate command.

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "feat: run source download before build in Vercel"
```

---

### Task 3: Update .gitignore and remove tracked files

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add source directory to .gitignore**

Append to `.gitignore`:

```
# Claude Code source (downloaded at build time from private GitHub Release)
packages/claude-code-source/src/
packages/web/public/search-index.json
```

Note: `packages/web/generated/` is already in `.gitignore`. The `packages/claude-code-source/README.md` and `packages/claude-code-source/package.json` can stay tracked — they contain no source code.

- [ ] **Step 2: Remove source files from git tracking**

```bash
git rm -r --cached packages/claude-code-source/src/
git rm --cached packages/web/public/search-index.json 2>/dev/null || true
```

- [ ] **Step 3: Commit the removal**

```bash
git commit -m "chore: remove claude-code-source from git tracking

Source files are now downloaded at build time from a private GitHub Release.
Set SOURCE_RELEASE_URL and GITHUB_TOKEN environment variables for CI/Vercel."
```

---

### Task 4: Create the source archive and upload to GitHub Release

This task is manual / semi-automated.

- [ ] **Step 1: Create the tar.gz archive**

From the repo root:

```bash
cd packages/claude-code-source
tar -czf claude-code-source.tar.gz -C src .
```

This creates an archive where extracting into an empty `src/` directory restores the original structure.

- [ ] **Step 2: Create a private GitHub repo (if not existing)**

Create a private repo, e.g. `your-username/claude-code-source-private`.

- [ ] **Step 3: Create a release and upload the archive**

```bash
gh release create v1.0 claude-code-source.tar.gz \
  --repo your-username/claude-code-source-private \
  --title "Claude Code Source v1.0" \
  --notes "Source archive for claude-harness build"
```

- [ ] **Step 4: Get the release asset URL**

```bash
gh release view v1.0 --repo your-username/claude-code-source-private --json assets -q '.assets[0].url'
```

This returns the API URL like `https://api.github.com/repos/your-username/claude-code-source-private/releases/assets/XXXXX`. Use this as `SOURCE_RELEASE_URL`.

- [ ] **Step 5: Configure Vercel environment variables**

In Vercel project settings → Environment Variables:
- `SOURCE_RELEASE_URL` = the asset API URL from step 4
- `GITHUB_TOKEN` = a GitHub Personal Access Token with `repo` scope (to read private releases)

- [ ] **Step 6: Clean up the local archive**

```bash
rm packages/claude-code-source/claude-code-source.tar.gz
```

---

### Task 5: Test the full flow

- [ ] **Step 1: Verify local dev still works**

Source files exist locally, so the download script should skip:

```bash
cd packages/scripts && npx tsx src/download-source.ts
```

Expected: "Source directory already exists, skipping download."

- [ ] **Step 2: Test download flow**

Temporarily rename the source directory and test download:

```bash
mv packages/claude-code-source/src packages/claude-code-source/src.bak
SOURCE_RELEASE_URL="<your-url>" GITHUB_TOKEN="<your-token>" npx tsx packages/scripts/src/download-source.ts
```

Expected: Downloads and extracts successfully.

```bash
rm -rf packages/claude-code-source/src
mv packages/claude-code-source/src.bak packages/claude-code-source/src
```

- [ ] **Step 3: Deploy to Vercel and verify**

Push the changes and verify the Vercel build succeeds with the source code browser working.
