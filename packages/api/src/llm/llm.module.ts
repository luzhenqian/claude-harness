import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LlmProvider } from './entities/llm-provider.entity';
import { LlmService } from './llm.service';

@Module({
  imports: [TypeOrmModule.forFeature([LlmProvider])],
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}
