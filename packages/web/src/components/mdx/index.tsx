type MDXComponents = Record<string, React.ComponentType<Record<string, unknown>>>;
import { CodeBlock } from "./CodeBlock";
import { MermaidDiagram } from "../MermaidDiagram";

function Pre({ children, ...props }: React.ComponentProps<"pre">) {
  const child = children as React.ReactElement<{ className?: string; children?: React.ReactNode }> | null;
  // Check if this is a mermaid code block
  if (
    child &&
    typeof child === "object" &&
    "props" in child &&
    child.props?.className === "language-mermaid"
  ) {
    const chart = extractText(child.props.children).trim();
    return <MermaidDiagram chart={chart} />;
  }

  // Otherwise render with syntax highlighting
  if (
    child &&
    typeof child === "object" &&
    "props" in child
  ) {
    return (
      <CodeBlock className={child.props?.className}>
        {child.props?.children}
      </CodeBlock>
    );
  }

  return <pre {...props}>{children}</pre>;
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

function Table({ children, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="not-prose my-6 overflow-x-auto rounded-lg border border-[var(--border)]">
      <table
        {...props}
        className="w-full text-sm"
      >
        {children}
      </table>
    </div>
  );
}

function Thead({ children, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead {...props} className="border-b border-[var(--border)] bg-[#141414]">
      {children}
    </thead>
  );
}

function Th({ children, ...props }: React.ComponentProps<"th">) {
  return (
    <th {...props} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">
      {children}
    </th>
  );
}

function Td({ children, ...props }: React.ComponentProps<"td">) {
  return (
    <td {...props} className="border-t border-[var(--border)] px-4 py-2 text-neutral-300">
      {children}
    </td>
  );
}

function InlineCode({ children, ...props }: React.ComponentProps<"code">) {
  // Skip if inside a pre (code block) — those are handled by Pre
  if (props.className?.startsWith("language-")) {
    return <code {...props}>{children}</code>;
  }
  return (
    <code
      className="rounded bg-[#1a1a2e] px-1.5 py-0.5 text-[0.875em] text-[#e0c4a8] before:content-none after:content-none"
    >
      {children}
    </code>
  );
}

function Blockquote({ children, ...props }: React.ComponentProps<"blockquote">) {
  return (
    <blockquote
      {...props}
      className="my-6 border-l-4 border-[var(--accent)] pl-4 text-neutral-300 italic"
    >
      {children}
    </blockquote>
  );
}

function Hr() {
  return <hr className="my-10 border-[var(--border)]" />;
}

export const mdxComponents: MDXComponents = {
  pre: Pre,
  code: InlineCode,
  table: Table,
  thead: Thead,
  th: Th,
  td: Td,
  blockquote: Blockquote,
  hr: Hr,
};
