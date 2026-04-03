import { createTool } from '@mastra/core';
import { z } from 'zod';

export function createSearchFilesTool(searchService: {
  searchCode: (query: string, limit: number) => Promise<any[]>;
}) {
  return createTool({
    id: 'search_files',
    description:
      'Search source code files by semantic meaning. Returns file paths, function/class names, and line ranges — NOT code content. Use read_file after this to get actual code.',
    inputSchema: z.object({
      query: z.string().describe('The search query describing what to find'),
      limit: z.number().optional().default(10).describe('Maximum number of results'),
    }),
    outputSchema: z.object({
      results: z.array(z.object({
        filePath: z.string(),
        chunkType: z.string(),
        name: z.string(),
        startLine: z.number(),
        endLine: z.number(),
        score: z.number(),
      })),
    }),
    execute: async ({ context: { query, limit } }) => {
      const results = await searchService.searchCode(query, limit || 10);
      if (results.length === 0) return { results: [] };
      return {
        results: results.map((r: any) => ({
          filePath: r.filePath,
          chunkType: r.chunkType || 'code',
          name: r.name,
          startLine: r.startLine,
          endLine: r.endLine,
          score: r.score,
        })),
      };
    },
  });
}
