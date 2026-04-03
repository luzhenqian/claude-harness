import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CodeChunk } from './entities/code-chunk.entity';
import { ArticleChunk } from './entities/article-chunk.entity';
import { IndexService } from './index.service';
import { IndexController } from './index.controller';
import { CodeIndexerService } from './code-indexer.service';
import { ArticleIndexerService } from './article-indexer.service';
import { EmbeddingService } from './embedding.service';
import { SearchService } from './search.service';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [TypeOrmModule.forFeature([CodeChunk, ArticleChunk]), LlmModule],
  controllers: [IndexController],
  providers: [IndexService, CodeIndexerService, ArticleIndexerService, EmbeddingService, SearchService],
  exports: [SearchService, IndexService],
})
export class IndexModule {}
