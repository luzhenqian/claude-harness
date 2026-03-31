import { codeToHtml } from "shiki";

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
    return extractText((node as React.ReactElement).props.children);
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
};

export async function CodeBlock({ children, className }: CodeBlockProps) {
  const rawLang = langFromClassName(className);
  const lang = LANG_MAP[rawLang] || rawLang;
  const code = extractText(children).replace(/\n$/, "");

  let html: string;
  try {
    html = await codeToHtml(code, {
      lang,
      theme: "github-dark",
    });
  } catch {
    // Fallback for unsupported languages
    html = await codeToHtml(code, {
      lang: "text",
      theme: "github-dark",
    });
  }

  return (
    <div
      className="not-prose my-4 overflow-x-auto rounded-lg text-sm [&_pre]:!bg-[#0d1117] [&_pre]:p-4"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
