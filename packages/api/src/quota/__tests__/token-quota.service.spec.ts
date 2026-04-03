import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpException } from '@nestjs/common';
import { TokenQuotaService } from '../token-quota.service';
import { TokenUsageService } from '../token-usage.service';
import { SystemConfigService } from '../system-config.service';

describe('TokenQuotaService', () => {
  let service: TokenQuotaService;
  let usageService: Partial<TokenUsageService>;
  let configService: Partial<SystemConfigService>;

  beforeEach(() => {
    usageService = {
      getDailyUsage: vi.fn(),
    };
    configService = {
      getTokenLimits: vi.fn().mockResolvedValue({
        dailyInputTokens: 500000,
        dailyOutputTokens: 100000,
        estimatedOutputTokens: 4096,
      }),
    };
    service = new TokenQuotaService(
      usageService as TokenUsageService,
      configService as SystemConfigService,
    );
  });

  it('should pass when usage is well under limits', async () => {
    (usageService.getDailyUsage as any).mockResolvedValue({ inputTokens: 1000, outputTokens: 500 });
    await expect(service.checkQuota('user-1')).resolves.not.toThrow();
  });

  it('should throw 429 when input tokens exceed limit', async () => {
    (usageService.getDailyUsage as any).mockResolvedValue({ inputTokens: 500000, outputTokens: 0 });
    await expect(service.checkQuota('user-1')).rejects.toThrow(HttpException);
    await expect(service.checkQuota('user-1')).rejects.toMatchObject({ status: 429 });
  });

  it('should throw 429 when output tokens plus estimate exceed limit', async () => {
    (usageService.getDailyUsage as any).mockResolvedValue({ inputTokens: 0, outputTokens: 95905 });
    await expect(service.checkQuota('user-1')).rejects.toThrow(HttpException);
  });

  it('should pass when output is exactly at threshold', async () => {
    (usageService.getDailyUsage as any).mockResolvedValue({ inputTokens: 0, outputTokens: 95904 });
    await expect(service.checkQuota('user-1')).resolves.not.toThrow();
  });

  it('should include details in the 429 response', async () => {
    (usageService.getDailyUsage as any).mockResolvedValue({ inputTokens: 500001, outputTokens: 0 });
    try {
      await service.checkQuota('user-1');
      expect.unreachable('should have thrown');
    } catch (e: any) {
      const response = e.getResponse();
      expect(response.details).toHaveProperty('dailyInputLimit', 500000);
      expect(response.details).toHaveProperty('dailyOutputLimit', 100000);
      expect(response.details).toHaveProperty('usedInput', 500001);
      expect(response.details).toHaveProperty('resetsAt');
    }
  });
});
