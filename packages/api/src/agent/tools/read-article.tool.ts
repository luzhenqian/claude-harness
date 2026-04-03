import { createTool } from '@mastra/core';
import { z } from 'zod';
import { readFile } from 'fs/promises';
import { join, resolve } from 'path';

export function createReadArticleTool(articlesRoot: string) {
  return createTool({
    id: 'read_article',
    description: 'Read the full content of a specific article by its slug.',
    inputSchema: z.object({
      slug: z.string().describe('The article slug (e.g., "01-overview")'),
      locale: z.string().optional().default('en').describe('Language: "en", "zh", or "ja"'),
    }),
    outputSchema: z.object({
      content: z.string(),
      title: z.string(),
    }),
    execute: async ({ context: { slug, locale } }) => {
      const lang = locale || 'en';
      const fullPath = resolve(join(articlesRoot, lang, `${slug}.mdx`));
      if (!fullPath.startsWith(resolve(articlesRoot))) {
        return { content: 'Error: invalid article slug.', title: '' };
      }
      try {
        const raw = await readFile(fullPath, 'utf-8');
        const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        if (!match) return { content: raw, title: slug };
        const frontmatter = match[1];
        const body = match[2];
        const titleMatch = frontmatter.match(/title:\s*['"]?(.+?)['"]?\s*$/m);
        const title = titleMatch ? titleMatch[1] : slug;
        return { content: `# ${title}\n\n${body}`, title };
      } catch {
        return { content: `Error: article "${slug}" not found for locale "${lang}".`, title: '' };
      }
    },
  });
}
