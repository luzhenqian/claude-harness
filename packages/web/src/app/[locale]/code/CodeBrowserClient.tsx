"use client";

import { useState, useCallback, useMemo, useTransition, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Search, ChevronDown, ChevronRight, FileText, Loader2 } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { fetchSourceCode } from "./actions";

interface TreeNode {
  name: string;
  path: string;
  type: "directory" | "file";
  children?: TreeNode[];
}

const EXT_TO_LANGUAGE: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  json: "json",
  css: "css",
  scss: "scss",
  html: "html",
  md: "markdown",
  yaml: "yaml",
  yml: "yaml",
  sh: "bash",
  bash: "bash",
  py: "python",
  rs: "rust",
  go: "go",
  sql: "sql",
  graphql: "graphql",
  xml: "xml",
  toml: "toml",
};

function detectLanguage(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_LANGUAGE[ext] ?? "text";
}

function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  if (!query) return nodes;
  const lower = query.toLowerCase();
  return nodes
    .map((node) => {
      if (node.type === "file") {
        return node.name.toLowerCase().includes(lower) ? node : null;
      }
      const filteredChildren = filterTree(node.children ?? [], query);
      if (filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return node.name.toLowerCase().includes(lower) ? node : null;
    })
    .filter(Boolean) as TreeNode[];
}

function FileNode({
  node,
  level = 0,
  selectedPath,
  onSelect,
  expandedPaths,
  highlightPath,
}: {
  node: TreeNode;
  level?: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  expandedPaths?: Set<string>;
  highlightPath?: string;
}) {
  const [isOpen, setIsOpen] = useState(
    expandedPaths?.has(node.path) ?? false
  );
  const isSelected = selectedPath === node.path && node.type === "file";
  const isHighlighted = highlightPath === node.path;
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isHighlighted && nodeRef.current) {
      nodeRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [isHighlighted]);

  if (node.type === "directory") {
    return (
      <div>
        <div
          ref={isHighlighted ? nodeRef : undefined}
          className={`flex items-center py-1.5 px-2 mx-2 my-0.5 rounded-lg cursor-pointer text-[14px] font-mono transition-colors ${
            isHighlighted
              ? "bg-[var(--accent)]/15 text-[var(--accent)]"
              : "hover:bg-white/5 text-[var(--text)]"
          }`}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5 mr-1.5 text-[var(--text-muted)]" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 mr-1.5 text-[var(--text-muted)]" />
          )}
          {node.name}/
        </div>
        {isOpen &&
          node.children?.map((child) => (
            <FileNode
              key={child.path}
              node={child}
              level={level + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              expandedPaths={expandedPaths}
              highlightPath={highlightPath}
            />
          ))}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center py-1.5 px-2 mx-2 my-0.5 rounded-lg cursor-pointer text-[14px] font-mono transition-colors ${
        isSelected
          ? "bg-[var(--accent)] text-black shadow-sm"
          : "text-[var(--text-dim)] hover:bg-white/5 hover:text-[var(--text)]"
      }`}
      style={{ paddingLeft: `${level * 12 + 24}px` }}
      onClick={() => onSelect(node.path)}
    >
      {node.name}
    </div>
  );
}

export default function CodeBrowserClient({ tree }: { tree: TreeNode[] }) {
  const searchParams = useSearchParams();
  const initialPath = searchParams.get("path") || "";

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Auto-expand to the path from URL query
  const expandedPaths = useMemo(() => {
    const paths = new Set<string>();
    if (initialPath) {
      // Expand all ancestor paths: "utils" → expand "utils"
      // "services/api" → expand "services" and "services/api"
      const parts = initialPath.split("/");
      let current = "";
      for (const part of parts) {
        current = current ? `${current}/${part}` : part;
        paths.add(current);
      }
    }
    return paths;
  }, [initialPath]);

  const filteredTree = useMemo(
    () => filterTree(tree, searchQuery),
    [tree, searchQuery],
  );

  const handleSelect = useCallback((path: string) => {
    setSelectedPath(path);
    setCode(null);
    setError(null);
    startTransition(async () => {
      const result = await fetchSourceCode(path);
      setCode(result.code);
      setError(result.error);
    });
  }, []);

  const language = selectedPath ? detectLanguage(selectedPath) : "typescript";

  return (
    <div
      className="flex-1 flex overflow-hidden bg-[var(--bg-card)] m-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-[var(--border)]"
      style={{
        marginTop: "80px",
        marginBottom: "40px",
        height: "calc(100vh - 120px)",
      }}
    >
      {/* Sidebar */}
      <div className="w-72 border-r border-[var(--border)] bg-[#0d0d10] flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-[var(--border)]">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#131316] border border-[var(--border)] rounded-xl py-2 pl-9 pr-3 text-[14px] text-[var(--text)] placeholder:text-[var(--text-muted)] shadow-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-3 custom-scrollbar">
          {filteredTree.map((node) => (
            <FileNode
              key={node.path}
              node={node}
              selectedPath={selectedPath}
              onSelect={handleSelect}
              expandedPaths={expandedPaths}
              highlightPath={initialPath}
            />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-[#0d0d10] overflow-hidden">
        <div className="h-14 border-b border-[var(--border)] flex items-center px-6 bg-[#111114]">
          <span className="text-[14px] font-mono text-[var(--text-muted)]">
            {selectedPath ? (
              <>
                {selectedPath
                  .split("/")
                  .slice(0, -1)
                  .map((segment, i) => (
                    <span key={i}>
                      {segment}
                      {" / "}
                    </span>
                  ))}
                <span className="text-[var(--text)] font-medium">
                  {selectedPath.split("/").pop()}
                </span>
              </>
            ) : (
              "Select a file to view"
            )}
          </span>
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar p-6 bg-[#09090b]">
          {!selectedPath && (
            <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)]">
              <FileText className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-[16px]">Select a file from the tree to view its source code</p>
            </div>
          )}

          {selectedPath && isPending && (
            <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)]">
              <Loader2 className="h-8 w-8 mb-4 animate-spin opacity-50" />
              <p className="text-[14px]">Loading source...</p>
            </div>
          )}

          {selectedPath && !isPending && error && (
            <div className="flex flex-col items-center justify-center h-full text-red-400">
              <p className="text-[14px]">{error}</p>
            </div>
          )}

          {selectedPath && !isPending && code !== null && (
            <div className="rounded-xl overflow-hidden border border-[var(--border)] shadow-[0_8px_30px_rgb(0,0,0,0.5)] bg-[#0d0d10]">
              {/* macOS window controls */}
              <div className="h-12 bg-[#111114] flex items-center px-4 border-b border-[var(--border)]">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-[#ef4444] opacity-80"></div>
                  <div className="w-3 h-3 rounded-full bg-[#eab308] opacity-80"></div>
                  <div className="w-3 h-3 rounded-full bg-[#22c55e] opacity-80"></div>
                </div>
                <span className="ml-4 text-[12px] font-mono text-[var(--text-muted)]">
                  {selectedPath.split("/").pop()}
                </span>
              </div>
              <SyntaxHighlighter
                language={language}
                style={vscDarkPlus}
                customStyle={{
                  margin: 0,
                  padding: "1.5rem",
                  background: "transparent",
                  fontSize: "13px",
                  fontFamily: "var(--font-mono)",
                  lineHeight: "1.6",
                }}
                showLineNumbers={true}
                lineNumberStyle={{
                  minWidth: "3em",
                  paddingRight: "1em",
                  color: "var(--text-muted)",
                  textAlign: "right",
                }}
              >
                {code}
              </SyntaxHighlighter>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
