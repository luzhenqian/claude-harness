import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { glob } from 'glob';
import { CodeChunk } from './entities/code-chunk.entity';
import { ArticleChunk } from './entities/article-chunk.entity';
import { CodeIndexerService } from './code-indexer.service';
import { ArticleIndexerService } from './article-indexer.service';
import { EmbeddingService } from './embedding.service';

@Injectable()
export class IndexService {
  private readonly logger = new Logger(IndexService.name);

  constructor(
    @InjectRepository(CodeChunk) private readonly codeChunkRepo: Repository<CodeChunk>,
    @InjectRepository(ArticleChunk) private readonly articleChunkRepo: Repository<ArticleChunk>,
    private readonly dataSource: DataSource,
    private readonly codeIndexer: CodeIndexerService,
    private readonly articleIndexer: ArticleIndexerService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async indexCode(sourceRoot: string, force: boolean = false): Promise<{ processed: number; skipped: number }> {
    const files = await glob('**/*.ts', { cwd: sourceRoot });
    let processed = 0, skipped = 0;

    for (const filePath of files) {
      const fullPath = join(sourceRoot, filePath);
      const source = await readFile(fullPath, 'utf-8');
      const hash = createHash('sha256').update(source).digest('hex');

      if (!force) {
        const existing = await this.codeChunkRepo.findOne({ where: { filePath, contentHash: hash } });
        if (existing) { skipped++; continue; }
      }

      await this.codeChunkRepo.delete({ filePath });
      const chunks = this.codeIndexer.parseSource(filePath, source);

      for (const chunk of chunks) {
        const descText = this.codeIndexer.buildDescriptionText(chunk);
        const embedding = await this.embeddingService.embed(descText);
        await this.dataSource.query(
          `INSERT INTO code_chunks (file_path, chunk_type, name, content, start_line, end_line, embedding, tsv, metadata, content_hash, version)
           VALUES ($1, $2, $3, $4, $5, $6, $7::vector, to_tsvector('english', $8), $9, $10, 'v1')`,
          [chunk.filePath, chunk.chunkType, chunk.name, chunk.content, chunk.startLine, chunk.endLine,
           `[${embedding.join(',')}]`, descText, JSON.stringify(chunk.metadata), hash],
        );
      }
      processed++;
      this.logger.log(`Indexed ${filePath}: ${chunks.length} chunks`);
    }
    return { processed, skipped };
  }

  async indexArticles(articlesRoot: string, force: boolean = false): Promise<{ processed: number; skipped: number }> {
    const locales = ['en', 'zh', 'ja'];
    let processed = 0, skipped = 0;

    for (const locale of locales) {
      const files = await glob('*.mdx', { cwd: join(articlesRoot, locale) });
      for (const fileName of files) {
        const slug = fileName.replace(/\.mdx$/, '');
        const fullPath = join(articlesRoot, locale, fileName);
        const raw = await readFile(fullPath, 'utf-8');
        const hash = createHash('sha256').update(raw).digest('hex');

        if (!force) {
          const existing = await this.articleChunkRepo.findOne({ where: { articleSlug: slug, locale, contentHash: hash } });
          if (existing) { skipped++; continue; }
        }

        await this.articleChunkRepo.delete({ articleSlug: slug, locale });
        const chunks = this.articleIndexer.parseArticle(slug, locale, raw);

        for (const chunk of chunks) {
          const descText = this.articleIndexer.buildDescriptionText(chunk);
          const embedding = await this.embeddingService.embed(descText);
          await this.dataSource.query(
            `INSERT INTO article_chunks (article_slug, locale, heading, content, embedding, tsv, metadata, content_hash, version)
             VALUES ($1, $2, $3, $4, $5::vector, to_tsvector('english', $6), $7, $8, 'v1')`,
            [chunk.articleSlug, chunk.locale, chunk.heading, chunk.content,
             `[${embedding.join(',')}]`, descText, JSON.stringify(chunk.metadata), hash],
          );
        }
        processed++;
        this.logger.log(`Indexed article ${slug} (${locale}): ${chunks.length} chunks`);
      }
    }
    return { processed, skipped };
  }

  async getStatus(): Promise<{ codeChunks: number; articleChunks: number }> {
    const codeChunks = await this.codeChunkRepo.count();
    const articleChunks = await this.articleChunkRepo.count();
    return { codeChunks, articleChunks };
  }
}
