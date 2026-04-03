import { AgentTool } from './tool.interface';
import { ToolDef } from '../../llm/llm-provider.interface';
import { readFile } from 'fs/promises';
import { join, resolve } from 'path';
import matter from 'gray-matter';

export class GetArticleTool implements AgentTool {
  readonly definition: ToolDef = {
    name: 'get_article',
    description: 'Get the full content of a specific article by its slug.',
    parameters: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          description: 'The article slug (e.g., "query-engine")',
        },
        locale: {
          type: 'string',
          description: 'Language: "en", "zh", or "ja" (default "en")',
        },
      },
      required: ['slug'],
    },
  };

  constructor(private readonly articlesRoot: string) {}

  async execute(args: Record<string, unknown>): Promise<string> {
    const slug = args.slug as string;
    const locale = (args.locale as string) || 'en';
    const fullPath = resolve(join(this.articlesRoot, locale, `${slug}.mdx`));
    if (!fullPath.startsWith(resolve(this.articlesRoot)))
      return 'Error: invalid article slug.';
    try {
      const raw = await readFile(fullPath, 'utf-8');
      const { data, content } = matter(raw);
      return `# ${data.title}\nTags: ${data.tags?.join(', ')}\n\n${content}`;
    } catch {
      return `Error: article "${slug}" not found for locale "${locale}".`;
    }
  }
}
