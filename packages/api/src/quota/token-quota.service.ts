import { Injectable, HttpException } from '@nestjs/common';
import { TokenUsageService } from './token-usage.service';
import { SystemConfigService } from './system-config.service';

@Injectable()
export class TokenQuotaService {
  constructor(
    private readonly usageService: TokenUsageService,
    private readonly configService: SystemConfigService,
  ) {}

  async checkQuota(userId: string): Promise<void> {
    const [usage, limits] = await Promise.all([
      this.usageService.getDailyUsage(userId),
      this.configService.getTokenLimits(),
    ]);

    const inputExceeded = usage.inputTokens >= limits.dailyInputTokens;
    const outputExceeded = usage.outputTokens + limits.estimatedOutputTokens > limits.dailyOutputTokens;

    if (inputExceeded || outputExceeded) {
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);

      throw new HttpException({
        statusCode: 429,
        message: 'Daily token limit exceeded',
        details: {
          dailyInputLimit: limits.dailyInputTokens,
          dailyOutputLimit: limits.dailyOutputTokens,
          usedInput: usage.inputTokens,
          usedOutput: usage.outputTokens,
          resetsAt: tomorrow.toISOString(),
        },
      }, 429);
    }
  }
}
