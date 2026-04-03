import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}
