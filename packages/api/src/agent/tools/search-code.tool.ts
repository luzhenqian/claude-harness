import { AgentTool } from './tool.interface';
import { ToolDef } from '../../llm/llm-provider.interface';

export class SearchCodeTool implements AgentTool {
  readonly definition: ToolDef = {
    name: 'search_code',
    description:
      'Search the Claude Code source code using semantic and keyword search. Returns matching code chunks with file paths, line numbers, and relevance scores.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query describing what code to find',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default 10)',
        },
      },
      required: ['query'],
    },
  };

  constructor(
    private readonly searchService: {
      searchCode: (query: string, limit: number) => Promise<any[]>;
    },
  ) {}

  async execute(args: Record<string, unknown>): Promise<string> {
    const query = args.query as string;
    const limit = (args.limit as number) || 10;
    const results = await this.searchService.searchCode(query, limit);
    if (results.length === 0) return 'No matching code found.';
    return results
      .map(
        (r: any, i: number) =>
          `[${i + 1}] ${r.filePath}#L${r.startLine}-L${r.endLine} (${r.chunkType || 'code'}: ${r.name}, score: ${r.score?.toFixed(2) || 'N/A'})\n\`\`\`typescript\n${r.content}\n\`\`\``,
      )
      .join('\n\n');
  }
}
