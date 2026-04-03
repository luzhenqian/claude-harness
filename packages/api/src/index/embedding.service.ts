import { Injectable } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';

@Injectable()
export class EmbeddingService {
  constructor(private readonly llmService: LlmService) {}

  async embed(text: string): Promise<number[]> {
    const provider = await this.llmService.getEmbeddingProvider();
    return provider.generateEmbedding(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      results.push(await this.embed(text));
    }
    return results;
  }
}
