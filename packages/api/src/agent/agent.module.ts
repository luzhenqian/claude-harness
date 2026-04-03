import { Module } from '@nestjs/common';
import { MastraService } from './mastra.service';
import { LlmModule } from '../llm/llm.module';
import { IndexModule } from '../index/index.module';

@Module({
  imports: [LlmModule, IndexModule],
  providers: [MastraService],
  exports: [MastraService],
})
export class AgentModule {}
