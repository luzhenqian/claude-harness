import { ToolDef } from '../../llm/llm-provider.interface';

export interface AgentTool {
  readonly definition: ToolDef;
  execute(args: Record<string, unknown>): Promise<string>;
}
