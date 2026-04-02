import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LlmProvider as LlmProviderEntity } from './entities/llm-provider.entity';
import { LLMProvider } from './llm-provider.interface';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAIProvider } from './providers/openai.provider';

@Injectable()
export class LlmService implements OnModuleInit {
  private chatProviders = new Map<string, LLMProvider>();
  private embeddingProviders = new Map<string, LLMProvider>();
  private defaultChatId: string | null = null;
  private defaultEmbeddingId: string | null = null;

  constructor(
    @InjectRepository(LlmProviderEntity)
    private readonly repo: Repository<LlmProviderEntity>,
  ) {}

  async onModuleInit() { await this.loadProviders(); }

  async loadProviders() {
    const records = await this.repo.find({ where: { enabled: true } });
    this.chatProviders.clear();
    this.embeddingProviders.clear();
    for (const record of records) {
      const provider = this.createProvider(record);
      if (!provider) continue;
      if (record.type === 'chat') {
        this.chatProviders.set(record.id, provider);
        if (record.isDefault) this.defaultChatId = record.id;
      } else if (record.type === 'embedding') {
        this.embeddingProviders.set(record.id, provider);
        if (record.isDefault) this.defaultEmbeddingId = record.id;
      }
    }
  }

  private createProvider(record: LlmProviderEntity): LLMProvider | null {
    switch (record.name) {
      case 'openai':
        return new OpenAIProvider(record.apiKey, record.model, record.model);
      case 'anthropic':
        return new AnthropicProvider(record.apiKey, record.model);
      case 'gemini':
        return new GeminiProvider(record.apiKey, record.model, record.model);
      default:
        return null;
    }
  }

  async getChatProvider(id?: string): Promise<LLMProvider> {
    if (!this.chatProviders.size) await this.loadProviders();
    const provider = id ? this.chatProviders.get(id)
      : this.defaultChatId ? this.chatProviders.get(this.defaultChatId)
      : this.chatProviders.values().next().value;
    if (!provider) throw new Error('No chat provider available');
    return provider;
  }

  async getEmbeddingProvider(): Promise<LLMProvider> {
    if (!this.embeddingProviders.size) await this.loadProviders();
    const provider = this.defaultEmbeddingId
      ? this.embeddingProviders.get(this.defaultEmbeddingId)
      : this.embeddingProviders.values().next().value;
    if (!provider) throw new Error('No embedding provider available');
    return provider;
  }
}
