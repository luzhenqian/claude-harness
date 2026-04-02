export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export type StreamChunk =
  | { type: 'text_delta'; delta: string }
  | { type: 'tool_call_start'; id: string; name: string }
  | { type: 'tool_call_delta'; id: string; argsDelta: string }
  | { type: 'tool_call_end'; id: string; arguments: string }
  | { type: 'done'; usage: { inputTokens: number; outputTokens: number } };

export interface LLMProvider {
  readonly name: string;
  chat(messages: Message[], tools?: ToolDef[]): AsyncIterable<StreamChunk>;
  generateEmbedding(text: string): Promise<number[]>;
}
