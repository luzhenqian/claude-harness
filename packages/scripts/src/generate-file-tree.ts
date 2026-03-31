import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";

export interface TreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: TreeNode[];
}

async function buildTree(dir: string, basePath: string): Promise<TreeNode[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nodes: TreeNode[] = [];

  for (const entry of entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  })) {
    const fullPath = join(dir, entry.name);
    const relPath = relative(basePath, fullPath);

    if (entry.isDirectory()) {
      const children = await buildTree(fullPath, basePath);
      nodes.push({ name: entry.name, path: relPath, type: "directory", children });
    } else {
      nodes.push({ name: entry.name, path: relPath, type: "file" });
    }
  }

  return nodes;
}

export async function generateFileTree(sourceDir: string): Promise<TreeNode[]> {
  return buildTree(sourceDir, sourceDir);
}
