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
