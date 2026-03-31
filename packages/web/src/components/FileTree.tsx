"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useState } from "react";

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: TreeNode[];
}

function TreeItem({ node, depth }: { node: TreeNode; depth: number }) {
  const [open, setOpen] = useState(depth < 1);
  const pathname = usePathname();
  const isActive = pathname === `/code/${node.path}`;

  if (node.type === "file") {
    return (
      <Link
        href={`/code/${node.path}`}
        className={`block truncate py-0.5 text-sm hover:text-[var(--accent)] ${
          isActive ? "text-[var(--accent)]" : "text-neutral-400"
        }`}
        style={{ paddingLeft: `${depth * 16}px` }}
      >
        {node.name}
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1 py-0.5 text-sm text-neutral-300 hover:text-white"
        style={{ paddingLeft: `${depth * 16}px` }}
      >
        <span className="text-xs">{open ? "▼" : "▶"}</span>
        {node.name}/
      </button>
      {open && node.children?.map((child) => (
        <TreeItem key={child.path} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export function FileTree({ tree }: { tree: TreeNode[] }) {
  return (
    <div className="h-full overflow-y-auto border-r border-[var(--border)] p-3 text-sm">
      {tree.map((node) => (
        <TreeItem key={node.path} node={node} depth={0} />
      ))}
    </div>
  );
}
