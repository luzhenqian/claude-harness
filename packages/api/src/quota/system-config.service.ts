import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from './entities/system-config.entity';

export interface TokenLimits {
  dailyInputTokens: number;
  dailyOutputTokens: number;
  estimatedOutputTokens: number;
}

@Injectable()
export class SystemConfigService {
  constructor(
    @InjectRepository(SystemConfig) private readonly repo: Repository<SystemConfig>,
  ) {}

  async getTokenLimits(): Promise<TokenLimits> {
    const config = await this.repo.findOne({ where: { key: 'token_limits' } });
    if (!config) {
      return { dailyInputTokens: 500000, dailyOutputTokens: 100000, estimatedOutputTokens: 4096 };
    }
    return config.value as TokenLimits;
  }
}
