import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './config/database.config';
import { AuthModule } from './auth/auth.module';
import { LlmModule } from './llm/llm.module';
import { AgentModule } from './agent/agent.module';
import { IndexModule } from './index/index.module';
import { ChatModule } from './chat/chat.module';
import { User } from './auth/entities/user.entity';
import { Conversation } from './chat/entities/conversation.entity';
import { Message } from './chat/entities/message.entity';
import { LlmProvider } from './llm/entities/llm-provider.entity';
import { CodeChunk } from './index/entities/code-chunk.entity';
import { ArticleChunk } from './index/entities/article-chunk.entity';
import { InitialSchema1712102400000 } from './migrations/1712102400000-InitialSchema';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...getDatabaseConfig(configService),
        entities: [User, Conversation, Message, LlmProvider, CodeChunk, ArticleChunk],
        migrations: [InitialSchema1712102400000],
      }),
    }),
    AuthModule,
    LlmModule,
    AgentModule,
    IndexModule,
    ChatModule,
  ],
})
export class AppModule {}
