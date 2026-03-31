import type { MDXComponents } from "mdx/types";
import { CodeBlock } from "./CodeBlock";
import { MermaidDiagram } from "../MermaidDiagram";

function Pre({ children, ...props }: React.ComponentProps<"pre">) {
  // Check if this is a mermaid code block
  if (
    children &&
    typeof children === "object" &&
    "props" in children &&
    children.props?.className === "language-mermaid"
  ) {
    const chart = extractText(children.props.children).trim();
    return <MermaidDiagram chart={chart} />;
  }

  // Otherwise render with syntax highlighting
  if (
    children &&
    typeof children === "object" &&
    "props" in children
  ) {
    return (
      <CodeBlock className={children.props?.className}>
        {children.props?.children}
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
    return extractText((node as React.ReactElement).props.children);
  }
  return "";
}

function Table({ children, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="my-6 overflow-x-auto rounded-lg border border-[var(--border)]">
      <table
        {...props}
        className="m-0 w-full border-collapse text-sm"
      >
        {children}
      </table>
    </div>
  );
}

function Thead({ children, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead {...props} className="bg-[#1a1a1a] text-left text-xs uppercase tracking-wider text-neutral-400">
      {children}
    </thead>
  );
}

function Th({ children, ...props }: React.ComponentProps<"th">) {
  return (
    <th {...props} className="px-4 py-3 font-semibold">
      {children}
    </th>
  );
}

function Td({ children, ...props }: React.ComponentProps<"td">) {
  return (
    <td {...props} className="border-t border-[var(--border)] px-4 py-3">
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
