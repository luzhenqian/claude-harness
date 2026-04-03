import { AgentTool } from './tool.interface';
import { ToolDef } from '../../llm/llm-provider.interface';
import { readFile } from 'fs/promises';
import { join, resolve } from 'path';

export class ReadFileTool implements AgentTool {
  readonly definition: ToolDef = {
    name: 'read_file',
    description:
      'Read the content of a source code file. Optionally specify line range to read only a portion.',
    parameters: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description:
            'Path relative to the source root (e.g., "services/query-engine.ts")',
        },
        start_line: {
          type: 'number',
          description: 'Start line number (1-based, optional)',
        },
        end_line: {
          type: 'number',
          description: 'End line number (1-based, optional)',
        },
      },
      required: ['file_path'],
    },
  };

  constructor(private readonly sourceRoot: string) {}

  async execute(args: Record<string, unknown>): Promise<string> {
    const filePath = args.file_path as string;
    const startLine = args.start_line as number | undefined;
    const endLine = args.end_line as number | undefined;

    const fullPath = resolve(join(this.sourceRoot, filePath));
    if (!fullPath.startsWith(resolve(this.sourceRoot)))
      return 'Error: invalid file path.';

    try {
      const content = await readFile(fullPath, 'utf-8');
      const lines = content.split('\n');
      if (startLine && endLine) {
        const slice = lines.slice(startLine - 1, endLine);
        return `File: ${filePath} (lines ${startLine}-${endLine})\n\`\`\`typescript\n${slice.join('\n')}\n\`\`\``;
      }
      return `File: ${filePath} (${lines.length} lines)\n\`\`\`typescript\n${content}\n\`\`\``;
    } catch {
      return `Error: file "${filePath}" not found.`;
    }
  }
}
