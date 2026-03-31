import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

export interface ModuleStats {
  name: string;
  path: string;
  fileCount: number;
  lineCount: number;
  description: string;
}

const MODULE_DESCRIPTIONS: Record<string, string> = {
  tools: "Agent tool implementations (~40 tools)",
  commands: "Slash command implementations (~50 commands)",
  components: "Ink UI components (~140 components)",
  hooks: "React hooks",
  services: "External service integrations",
  bridge: "IDE integration bridge (VS Code, JetBrains)",
  coordinator: "Multi-agent coordinator",
  plugins: "Plugin system",
  skills: "Skill system",
  vim: "Vim mode",
  voice: "Voice input",
  ink: "Ink renderer wrapper",
  screens: "Full-screen UIs",
  types: "TypeScript type definitions",
  utils: "Utility functions",
  state: "State management",
  tasks: "Task management",
  memdir: "Memory directory (persistent memory)",
  schemas: "Config schemas (Zod)",
  migrations: "Config migrations",
  keybindings: "Keybinding configuration",
  remote: "Remote sessions",
  server: "Server mode",
  entrypoints: "Initialization logic",
  query: "Query pipeline",
  upstreamproxy: "Proxy configuration",
  buddy: "Companion sprite (Easter egg)",
};

async function countLines(filePath: string): Promise<number> {
  const content = await readFile(filePath, "utf-8");
  return content.split("\n").length;
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
      lines += await countLines(fullPath);
    }
  }

  return { files, lines };
}

export async function generateModuleStats(sourceDir: string): Promise<ModuleStats[]> {
  const entries = await readdir(sourceDir, { withFileTypes: true });
  const modules: ModuleStats[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const fullPath = join(sourceDir, entry.name);
    const stats = await walkDir(fullPath);
    modules.push({
      name: entry.name,
      path: entry.name,
      fileCount: stats.files,
      lineCount: stats.lines,
      description: MODULE_DESCRIPTIONS[entry.name] || "",
    });
  }

  return modules.sort((a, b) => b.lineCount - a.lineCount);
}
