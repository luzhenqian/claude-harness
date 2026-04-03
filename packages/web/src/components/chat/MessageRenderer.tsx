'use client';

import { useMemo } from 'react';
import { Streamdown } from 'streamdown';
import { code } from '@streamdown/code';
import { cjk } from '@streamdown/cjk';

interface Props {
  content: string;
  locale?: string;
  isStreaming?: boolean;
}

function transformReferences(content: string, locale: string = 'en'): string {
  // 1. Explicit [source:path#L10-L20] references
  let result = content.replace(
    /\[source:([^\]]+?)(?:#L(\d+)(?:-L(\d+))?)?\]/g,
    (_, rawPath, startLine, endLine) => {
      const filePath = rawPath.replace(/^src\//, '');
      const lineRange = startLine ? (endLine ? `#L${startLine}-L${endLine}` : `#L${startLine}`) : '';
      return `[📄 \`${filePath}${lineRange}\`](/${locale}/code?file=${encodeURIComponent(filePath)}${lineRange})`;
    },
  );

  // 2. Explicit [article:slug] references
  result = result.replace(
    /\[article:([^\]]+)\]/g,
    (_, slug) => `[📚 ${slug}](/${locale}/articles/${slug})`,
  );

  // 3. Auto-detect bare inline code file paths: `path/to/file.ts` or `file.tsx`
  //    Convert to clickable links. Only match paths that look like real source files.
  //    Must contain a dot + ts/tsx/js extension, and NOT already be inside a markdown link.
  result = result.replace(
    /(?<!\[📄 |]\()`((?:[\w./-]+\/)?[\w.-]+\.(?:ts|tsx|js|jsx)(?:#L\d+(?:-L\d+)?)?)`/g,
    (match, rawPath) => {
      const filePath = rawPath.replace(/^src\//, '');
      const lineMatch = filePath.match(/(.*?)(#L\d+(?:-L\d+)?)$/);
      const path = lineMatch ? lineMatch[1] : filePath;
      const lineRange = lineMatch ? lineMatch[2] : '';
      return `[📄 \`${filePath}\`](/${locale}/code?file=${encodeURIComponent(path)}${lineRange})`;
    },
  );

  return result;
}

export function MessageRenderer({ content, locale, isStreaming }: Props) {
  const processed = useMemo(() => transformReferences(content, locale), [content, locale]);

  return (
    <div className="chat-markdown">
      <Streamdown
        plugins={{ code, cjk }}
        isAnimating={isStreaming}
        mode={isStreaming ? 'streaming' : 'static'}
        linkSafety={{ enabled: false }}
      >
        {processed}
      </Streamdown>
    </div>
  );
}
