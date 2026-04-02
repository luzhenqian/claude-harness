import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIProvider } from '../../../src/llm/providers/openai.provider';

vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            async *[Symbol.asyncIterator]() {
              yield { choices: [{ delta: { content: 'Hello' }, finish_reason: null }], usage: null };
              yield { choices: [{ delta: { content: ' world' }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 5 } };
            },
          }),
        },
      },
      embeddings: {
        create: vi.fn().mockResolvedValue({
          data: [{ embedding: [0.1, 0.2, 0.3] }],
        }),
      },
    })),
  };
});

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    provider = new OpenAIProvider('test-api-key', 'gpt-4o', 'text-embedding-3-small');
  });

  it('should have name "openai"', () => {
    expect(provider.name).toBe('openai');
  });

  it('should stream chat responses as StreamChunks', async () => {
    const chunks: any[] = [];
    for await (const chunk of provider.chat([{ role: 'user', content: 'Hi' }])) {
      chunks.push(chunk);
    }
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0]).toEqual({ type: 'text_delta', delta: 'Hello' });
    expect(chunks[1]).toEqual({ type: 'text_delta', delta: ' world' });
  });

  it('should generate embeddings', async () => {
    const embedding = await provider.generateEmbedding('test text');
    expect(embedding).toEqual([0.1, 0.2, 0.3]);
  });
});
