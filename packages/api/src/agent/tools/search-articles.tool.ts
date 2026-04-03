import { AgentTool } from './tool.interface';
import { ToolDef } from '../../llm/llm-provider.interface';

export class SearchArticlesTool implements AgentTool {
  readonly definition: ToolDef = {
    name: 'search_articles',
    description:
      'Search technical articles about Claude Code architecture and subsystems. Returns matching article sections.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query' },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default 5)',
        },
      },
      required: ['query'],
    },
  };

  constructor(
    private readonly searchService: {
      searchArticles: (query: string, limit: number) => Promise<any[]>;
    },
  ) {}

  async execute(args: Record<string, unknown>): Promise<string> {
    const query = args.query as string;
    const limit = (args.limit as number) || 5;
    const results = await this.searchService.searchArticles(query, limit);
    if (results.length === 0) return 'No matching articles found.';
    return results
      .map(
        (r: any, i: number) =>
          `[${i + 1}] [article:${r.articleSlug}] — "${r.metadata?.title || r.articleSlug}" > ${r.heading}\n${r.content.slice(0, 500)}${r.content.length > 500 ? '...' : ''}`,
      )
      .join('\n\n');
  }
}
