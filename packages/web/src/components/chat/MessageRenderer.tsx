'use client';

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { MermaidDiagram } from '@/components/MermaidDiagram';

interface Props { content: string; locale?: string; }

function transformReferences(content: string, locale: string = 'en'): string {
  let result = content.replace(
    /\[source:([^\]]+?)(?:#L(\d+)(?:-L(\d+))?)?\]/g,
    (_, filePath, startLine, endLine) => {
      const lineRange = startLine ? (endLine ? `#L${startLine}-L${endLine}` : `#L${startLine}`) : '';
      return `[📄 \`${filePath}${lineRange}\`](/${locale}/code?file=${encodeURIComponent(filePath)}${lineRange})`;
    },
  );
  result = result.replace(
    /\[article:([^\]]+)\]/g,
    (_, slug) => `[📚 ${slug}](/${locale}/articles/${slug})`,
  );
  return result;
}

export function MessageRenderer({ content, locale }: Props) {
  const processed = useMemo(() => transformReferences(content, locale), [content, locale]);

  return (
    <ReactMarkdown
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const lang = match ? match[1] : '';
          const codeStr = String(children).replace(/\n$/, '');

          if (lang === 'mermaid') return <MermaidDiagram chart={codeStr} />;

          if (!match) {
            return (
              <code className="rounded px-1.5 py-0.5 text-xs" style={{ background: 'var(--bg-code)', color: 'var(--accent)' }} {...props}>
                {children}
              </code>
            );
          }

          return (
            <SyntaxHighlighter style={oneDark} language={lang}
              customStyle={{ fontSize: '12px', borderRadius: '8px', margin: '8px 0' }}>
              {codeStr}
            </SyntaxHighlighter>
          );
        },
        a({ href, children }) {
          return (
            <a href={href} target={href?.startsWith('http') ? '_blank' : undefined}
              rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="underline underline-offset-2" style={{ color: 'var(--accent)' }}>
              {children}
            </a>
          );
        },
        p({ children }) { return <p className="mb-2 last:mb-0">{children}</p>; },
        ul({ children }) { return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>; },
        ol({ children }) { return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>; },
      }}
    >
      {processed}
    </ReactMarkdown>
  );
}
