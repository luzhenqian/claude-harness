import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenUsage } from './entities/token-usage.entity';
import { SystemConfig } from './entities/system-config.entity';
import { TokenUsageService } from './token-usage.service';
import { SystemConfigService } from './system-config.service';
import { TokenQuotaService } from './token-quota.service';
import { TokenQuotaGuard } from './guards/token-quota.guard';

@Module({
  imports: [TypeOrmModule.forFeature([TokenUsage, SystemConfig])],
  providers: [TokenUsageService, SystemConfigService, TokenQuotaService, TokenQuotaGuard],
  exports: [TokenUsageService, TokenQuotaService, TokenQuotaGuard],
})
export class QuotaModule {}
