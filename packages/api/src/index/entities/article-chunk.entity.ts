import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('article_chunks')
export class ArticleChunk {
  @ApiProperty({ description: 'Chunk UUID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Source article slug' })
  @Column({ name: 'article_slug' })
  articleSlug: string;

  @ApiProperty({ description: 'Content locale', example: 'en' })
  @Column()
  locale: string;

  @ApiProperty({ description: 'Section heading' })
  @Column()
  heading: string;

  @ApiProperty({ description: 'Chunk text content' })
  @Column('text')
  content: string;

  @ApiProperty({ description: 'Embedding vector', required: false })
  @Column({ type: 'float', array: true, nullable: true })
  embedding: number[];

  @ApiProperty({ description: 'Full-text search vector', required: false })
  @Column({ type: 'tsvector', nullable: true })
  tsv: string;

  @ApiProperty({ description: 'Additional metadata' })
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @ApiProperty({ description: 'Content hash for deduplication' })
  @Column({ name: 'content_hash' })
  contentHash: string;

  @ApiProperty({ description: 'Schema version', example: 'v1' })
  @Column({ default: 'v1' })
  version: string;
}
