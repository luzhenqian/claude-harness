import { createTool } from '@mastra/core';
import { z } from 'zod';
import { readFile } from 'fs/promises';
import { join, resolve } from 'path';

export function createReadFileTool(sourceRoot: string) {
  return createTool({
    id: 'read_file',
    description:
      'Read the content of a source code file. Use after search_files to get actual code. Optionally specify line range.',
    inputSchema: z.object({
      file_path: z.string().describe('Path relative to source root (e.g., "QueryEngine.ts" or "services/tools/StreamingToolExecutor.ts")'),
      start_line: z.number().optional().describe('Start line number (1-based)'),
      end_line: z.number().optional().describe('End line number (1-based)'),
    }),
    outputSchema: z.object({
      content: z.string(),
      filePath: z.string(),
      totalLines: z.number(),
    }),
    execute: async ({ context: { file_path, start_line, end_line } }) => {
      const fullPath = resolve(join(sourceRoot, file_path));
      if (!fullPath.startsWith(resolve(sourceRoot))) {
        return { content: 'Error: invalid file path.', filePath: file_path, totalLines: 0 };
      }
      try {
        const raw = await readFile(fullPath, 'utf-8');
        const lines = raw.split('\n');
        if (start_line && end_line) {
          const slice = lines.slice(start_line - 1, end_line);
          return {
            content: `\`\`\`typescript\n${slice.join('\n')}\n\`\`\``,
            filePath: file_path,
            totalLines: lines.length,
          };
        }
        return {
          content: `\`\`\`typescript\n${raw}\n\`\`\``,
          filePath: file_path,
          totalLines: lines.length,
        };
      } catch {
        return { content: `Error: file "${file_path}" not found.`, filePath: file_path, totalLines: 0 };
      }
    },
  });
}
