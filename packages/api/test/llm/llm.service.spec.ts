import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LlmService } from '../../src/llm/llm.service';
import { Repository } from 'typeorm';
import { LlmProvider } from '../../src/llm/entities/llm-provider.entity';

describe('LlmService', () => {
  let service: LlmService;
  let repo: Repository<LlmProvider>;

  beforeEach(() => {
    repo = {
      find: vi.fn().mockResolvedValue([
        { id: '1', name: 'openai', type: 'chat', model: 'gpt-4o', apiKey: 'key1', isDefault: true, enabled: true, config: {} },
        { id: '2', name: 'openai', type: 'embedding', model: 'text-embedding-3-small', apiKey: 'key1', isDefault: true, enabled: true, config: {} },
      ]),
    } as any;
    service = new LlmService(repo);
  });

  it('should get the default chat provider', async () => {
    const provider = await service.getChatProvider();
    expect(provider).toBeDefined();
    expect(provider.name).toBe('openai');
  });

  it('should get the default embedding provider', async () => {
    const provider = await service.getEmbeddingProvider();
    expect(provider).toBeDefined();
    expect(provider.name).toBe('openai');
  });
});
