import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenUsage } from './entities/token-usage.entity';

export interface DailyUsage {
  inputTokens: number;
  outputTokens: number;
}

@Injectable()
export class TokenUsageService {
  constructor(
    @InjectRepository(TokenUsage) private readonly repo: Repository<TokenUsage>,
  ) {}

  async getDailyUsage(userId: string): Promise<DailyUsage> {
    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);

    const result = await this.repo
      .createQueryBuilder('tu')
      .select('COALESCE(SUM(tu.input_tokens), 0)', 'inputTokens')
      .addSelect('COALESCE(SUM(tu.output_tokens), 0)', 'outputTokens')
      .where('tu.user_id = :userId', { userId })
      .andWhere('tu.created_at >= :todayUtc', { todayUtc })
      .getRawOne();

    return {
      inputTokens: parseInt(result.inputTokens, 10),
      outputTokens: parseInt(result.outputTokens, 10),
    };
  }

  async record(params: {
    userId: string;
    conversationId: string;
    inputTokens: number;
    outputTokens: number;
    provider: string;
    model: string;
  }): Promise<TokenUsage> {
    const usage = this.repo.create(params);
    return this.repo.save(usage);
  }
}
