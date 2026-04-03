import { createTool } from '@mastra/core';
import { z } from 'zod';

export function createSearchArticlesTool(searchService: {
  searchArticles: (query: string, limit: number, locale?: string) => Promise<any[]>;
}) {
  return createTool({
    id: 'search_articles',
    description:
      'Search articles about Claude Code architecture. Returns article slugs and section headings — NOT full content. Use read_article after this to get content.',
    inputSchema: z.object({
      query: z.string().describe('The search query'),
      limit: z.number().optional().default(5).describe('Maximum number of results'),
    }),
    outputSchema: z.object({
      results: z.array(z.object({
        articleSlug: z.string(),
        heading: z.string(),
        score: z.number(),
      })),
    }),
    execute: async ({ context: { query, limit } }) => {
      const results = await searchService.searchArticles(query, limit || 5);
      if (results.length === 0) return { results: [] };
      return {
        results: results.map((r: any) => ({
          articleSlug: r.articleSlug,
          heading: r.heading,
          score: r.score,
        })),
      };
    },
  });
}
