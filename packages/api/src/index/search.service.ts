import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EmbeddingService } from './embedding.service';

export interface CodeSearchResult {
  id: string;
  filePath: string;
  chunkType: string;
  name: string;
  content: string;
  startLine: number;
  endLine: number;
  score: number;
  metadata: Record<string, unknown>;
}

export interface ArticleSearchResult {
  id: string;
  articleSlug: string;
  locale: string;
  heading: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

@Injectable()
export class SearchService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async searchCode(query: string, limit: number = 10): Promise<CodeSearchResult[]> {
    const embedding = await this.embeddingService.embed(query);
    const embeddingStr = `[${embedding.join(',')}]`;

    const sql = `
      WITH vector_results AS (
        SELECT id, file_path, chunk_type, name, content, start_line, end_line, metadata,
               1 - (embedding <=> $1::vector) AS vec_score
        FROM code_chunks WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector LIMIT $2
      ),
      text_results AS (
        SELECT id, file_path, chunk_type, name, content, start_line, end_line, metadata,
               ts_rank(tsv, plainto_tsquery('english', $3)) AS text_score
        FROM code_chunks WHERE tsv @@ plainto_tsquery('english', $3)
        ORDER BY text_score DESC LIMIT $2
      )
      SELECT DISTINCT ON (combined.id)
        combined.id, combined.file_path, combined.chunk_type, combined.name,
        combined.content, combined.start_line, combined.end_line, combined.metadata,
        COALESCE(v.vec_score, 0) * 0.7 + COALESCE(t.text_score, 0) * 0.3 AS score
      FROM (SELECT * FROM vector_results UNION ALL SELECT * FROM text_results) combined
      LEFT JOIN vector_results v ON v.id = combined.id
      LEFT JOIN text_results t ON t.id = combined.id
      ORDER BY combined.id, score DESC
    `;

    const rows = await this.dataSource.query(sql, [embeddingStr, limit, query]);
    return rows.map((r: any) => ({
      id: r.id, filePath: r.file_path, chunkType: r.chunk_type, name: r.name,
      content: r.content, startLine: r.start_line, endLine: r.end_line,
      score: parseFloat(r.score), metadata: r.metadata,
    }));
  }

  async searchArticles(query: string, limit: number = 5, locale: string = 'en'): Promise<ArticleSearchResult[]> {
    const embedding = await this.embeddingService.embed(query);
    const embeddingStr = `[${embedding.join(',')}]`;

    const sql = `
      WITH vector_results AS (
        SELECT id, article_slug, locale, heading, content, metadata,
               1 - (embedding <=> $1::vector) AS vec_score
        FROM article_chunks WHERE embedding IS NOT NULL AND locale = $4
        ORDER BY embedding <=> $1::vector LIMIT $2
      ),
      text_results AS (
        SELECT id, article_slug, locale, heading, content, metadata,
               ts_rank(tsv, plainto_tsquery('english', $3)) AS text_score
        FROM article_chunks WHERE tsv @@ plainto_tsquery('english', $3) AND locale = $4
        ORDER BY text_score DESC LIMIT $2
      )
      SELECT DISTINCT ON (combined.id)
        combined.id, combined.article_slug, combined.locale, combined.heading,
        combined.content, combined.metadata,
        COALESCE(v.vec_score, 0) * 0.7 + COALESCE(t.text_score, 0) * 0.3 AS score
      FROM (SELECT * FROM vector_results UNION ALL SELECT * FROM text_results) combined
      LEFT JOIN vector_results v ON v.id = combined.id
      LEFT JOIN text_results t ON t.id = combined.id
      ORDER BY combined.id, score DESC
    `;

    const rows = await this.dataSource.query(sql, [embeddingStr, limit, query, locale]);
    return rows.map((r: any) => ({
      id: r.id, articleSlug: r.article_slug, locale: r.locale, heading: r.heading,
      content: r.content, score: parseFloat(r.score), metadata: r.metadata,
    }));
  }
}
