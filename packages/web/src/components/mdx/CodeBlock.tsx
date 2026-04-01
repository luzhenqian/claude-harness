import { codeToTokens, type BundledLanguage } from "shiki";

interface CodeBlockProps {
  children: React.ReactNode;
  className?: string;
}

function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (!node) return "";
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (typeof node === "object" && "props" in node) {
    return extractText((node as React.ReactElement<{ children?: React.ReactNode }>).props.children);
  }
  return "";
}

function langFromClassName(className?: string): string {
  if (!className) return "text";
  const match = className.match(/language-(\w+)/);
  return match ? match[1] : "text";
}

const LANG_MAP: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  gitignore: "text",
  text: "text",
  txt: "text",
};

const LANG_DISPLAY: Record<string, string> = {
  typescript: "TypeScript",
  tsx: "TSX",
  javascript: "JavaScript",
  jsx: "JSX",
  bash: "Bash",
  json: "JSON",
  css: "CSS",
  html: "HTML",
  yaml: "YAML",
  toml: "TOML",
  text: "Text",
  python: "Python",
  rust: "Rust",
  go: "Go",
};

/**
 * Parse the first comment line for metadata.
 * Patterns:
 *   // src/main.tsx
 *   // src/main.tsx:12-20
 *   // src/commands.ts — 工具注册表
 *   // src/state/store.ts（完整实现）
 */
function parseMetadata(code: string): {
  filename: string | null;
  startLine: number;
  cleanCode: string;
} {
  const lines = code.split("\n");
  const firstLine = lines[0]?.trim() || "";

  // Match comment with file path: // src/file.ts or // src/file.ts:100-200
  const metaMatch = firstLine.match(
    /^\/\/\s*([\w/.@-]+\.\w+(?::\d+(?:-\d+)?)?)(?:\s*[—（(].*)?$/
  );

  if (metaMatch) {
    const filepath = metaMatch[1].trim();
    // Extract line range before cleaning filename for display
    const rangeMatch = filepath.match(/:(\d+)(?:-(\d+))?$/);
    const startLine = rangeMatch ? parseInt(rangeMatch[1], 10) : 1;
    const cleanCode = lines.slice(1).join("\n").replace(/^\n/, "");
    // Display filename includes the range (e.g. "src/commands.ts:190-200")
    return { filename: filepath, startLine, cleanCode };
  }

  return { filename: null, startLine: 1, cleanCode: code };
}

/**
 * Detect which lines should be highlighted.
 * Priority:
 * 1. Explicit markers: `// [!highlight]` or `// [!hl]` at end of line
 * 2. `// highlight-next-line` on previous line
 * 3. Auto-detect: Chinese comment lines (author annotations) and the
 *    non-empty code lines immediately following them
 */
function detectHighlightLines(code: string): Set<number> {
  const lines = code.split("\n");
  const highlights = new Set<number>();
  let hasExplicitMarkers = false;

  // First pass: check for explicit markers
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/\/\/\s*\[!highlight\]|\/\/\s*\[!hl\]/.test(line)) {
      highlights.add(i);
      hasExplicitMarkers = true;
    }
    if (/^\s*\/\/\s*highlight-next-line\s*$/.test(line)) {
      hasExplicitMarkers = true;
      if (i + 1 < lines.length) highlights.add(i + 1);
    }
  }

  // If explicit markers found, use only those
  if (hasExplicitMarkers) return highlights;

  // Auto-detect: Chinese comment lines + following code lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Chinese comment line (contains CJK characters in a comment)
    if (/^\/\/.*[\u4e00-\u9fff]/.test(line)) {
      highlights.add(i);
      // Also highlight subsequent non-empty, non-comment code lines
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j].trim();
        if (!next || /^\/\//.test(next)) break;
        highlights.add(j);
      }
    }
  }

  return highlights;
}

/**
 * Detect if this is a pseudocode/data-flow block:
 * no language tag, contains → arrows, describes a pipeline or flow.
 */
function isFlowBlock(lang: string, code: string): boolean {
  return (lang === "text") && /→/.test(code) && code.split("\n").length <= 15;
}

/**
 * Render a flow block as a styled card with colored inline syntax.
 * Applies syntax coloring to function names, keywords, types etc.
 */
function FlowBlock({ code }: { code: string }) {
  const lines = code.split("\n").filter((l) => l.trim());

  // Try to extract a title from the preceding heading context
  // We'll derive it from the content pattern
  const firstLine = lines[0] || "";
  const hasSubmitMessage = firstLine.includes("submitMessage");
  const title = hasSubmitMessage ? "核心数据流（简化）" : "流程";

  return (
    <div
      className="not-prose"
      style={{
        margin: "24px 0 28px",
        borderRadius: "14px",
        border: "1px solid rgba(245,158,11,0.25)",
        background: "rgba(245,158,11,0.03)",
        overflow: "hidden",
      }}
    >
      {/* Title bar */}
      <div
        style={{
          padding: "14px 24px",
          fontSize: "14px",
          fontWeight: 600,
          color: "var(--accent)",
          borderBottom: "2px solid rgba(245,158,11,0.2)",
        }}
      >
        {title}
      </div>
      {/* Flow content */}
      <div
        style={{
          padding: "24px 28px",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "14px",
          lineHeight: 2.2,
        }}
      >
        {lines.map((line, i) => (
          <div key={i}>
            <FlowLine text={line} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Colorize a single flow line: function names, arrows, keywords, types */
function FlowLine({ text }: { text: string }) {
  // Split by common tokens and colorize
  const parts = text.split(
    /(\w+\.\w+\([^)]*\)|\w+\([^)]*\)|→|tool_use|tool_result)/g
  );

  return (
    <>
      {parts.map((part, i) => {
        if (part === "→") {
          return (
            <span key={i} style={{ color: "var(--text-muted)" }}>
              {part}
            </span>
          );
        }
        if (part === "tool_use" || part === "tool_result") {
          return (
            <span key={i} style={{ color: "var(--accent)" }}>
              {part}
            </span>
          );
        }
        if (/\w+\.\w+\(/.test(part) || /\w+\(/.test(part)) {
          // Function call: color the function name
          const fnMatch = part.match(/^(\w+(?:\.\w+)?)\(([^)]*)\)$/);
          if (fnMatch) {
            return (
              <span key={i}>
                <span style={{ color: "#60a5fa" }}>{fnMatch[1]}</span>
                <span style={{ color: "var(--text-muted)" }}>(</span>
                {fnMatch[2] && <span style={{ color: "var(--text-dim)" }}>{fnMatch[2]}</span>}
                <span style={{ color: "var(--text-muted)" }}>)</span>
              </span>
            );
          }
          return (
            <span key={i} style={{ color: "#60a5fa" }}>
              {part}
            </span>
          );
        }
        // Check for Chinese descriptive text (dimmer)
        if (/[\u4e00-\u9fff]/.test(part) && /[→]/.test(text)) {
          return (
            <span key={i} style={{ color: "var(--text-dim)", fontStyle: "italic" }}>
              {part}
            </span>
          );
        }
        return (
          <span key={i} style={{ color: "var(--text)" }}>
            {part}
          </span>
        );
      })}
    </>
  );
}

export async function CodeBlock({ children, className }: CodeBlockProps) {
  const rawLang = langFromClassName(className);
  const lang = LANG_MAP[rawLang] || rawLang;
  const rawCode = extractText(children).replace(/\n$/, "");

  // Special rendering for pseudocode flow blocks
  if (isFlowBlock(lang, rawCode)) {
    return <FlowBlock code={rawCode} />;
  }

  const { filename, startLine, cleanCode } = parseMetadata(rawCode);
  const highlightLines = detectHighlightLines(cleanCode);

  // Remove marker comments from display
  const displayCode = cleanCode
    .split("\n")
    .map((l) =>
      l
        .replace(/\s*\/\/\s*\[!highlight\]\s*$/, "")
        .replace(/\s*\/\/\s*\[!hl\]\s*$/, "")
    )
    .filter((l) => !/^\s*\/\/\s*highlight-next-line\s*$/.test(l))
    .join("\n");

  const displayLang = LANG_DISPLAY[lang] || lang.toUpperCase();

  let tokens;
  try {
    tokens = await codeToTokens(displayCode, {
      lang: lang as BundledLanguage,
      theme: "github-dark",
    });
  } catch {
    tokens = await codeToTokens(displayCode, {
      lang: "text" as BundledLanguage,
      theme: "github-dark",
    });
  }

  const lines = tokens.tokens;

  return (
    <div className="code-block not-prose">
      {/* Header */}
      <div className="code-header">
        <div className="code-header-left">
          <div className="code-dots">
            <span className="r"></span>
            <span className="y"></span>
            <span className="g"></span>
          </div>
          {filename && <span className="code-filename">{filename}</span>}
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span className="code-lang">{displayLang}</span>
          <CopyButton />
        </div>
      </div>

      {/* Code body */}
      <div className="code-body">
        {lines.map((lineTokens, lineIdx) => {
          const lineNum = startLine + lineIdx;
          const isHighlighted = highlightLines.has(lineIdx);

          return (
            <div
              key={lineIdx}
              className={`code-line${isHighlighted ? " highlighted" : ""}`}
            >
              <span className="code-ln">{lineNum}</span>
              <span className="code-content">
                {lineTokens.map((token, tokenIdx) => (
                  <span key={tokenIdx} style={{ color: token.color }}>
                    {token.content}
                  </span>
                ))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Client component for copy button */
function CopyButton() {
  return (
    <button
      className="code-copy"
      data-copy-btn
      onClick={undefined} // hydrated client-side below
    >
      复制
    </button>
  );
}

// Inject client-side copy handler via a script tag
export function CodeBlockCopyScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          document.addEventListener('click', function(e) {
            var btn = e.target.closest('[data-copy-btn]');
            if (!btn) return;
            var block = btn.closest('.code-block');
            if (!block) return;
            var lines = block.querySelectorAll('.code-content');
            var text = Array.from(lines).map(function(l) { return l.textContent; }).join('\\n');
            navigator.clipboard.writeText(text).then(function() {
              var orig = btn.textContent;
              btn.textContent = '已复制 ✓';
              setTimeout(function() { btn.textContent = orig; }, 1500);
            });
          });
        `,
      }}
    />
  );
}
