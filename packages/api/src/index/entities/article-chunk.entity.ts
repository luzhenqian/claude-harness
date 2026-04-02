import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('article_chunks')
export class ArticleChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'article_slug' })
  articleSlug: string;

  @Column()
  locale: string;

  @Column()
  heading: string;

  @Column('text')
  content: string;

  @Column({ type: 'float', array: true, nullable: true })
  embedding: number[];

  @Column({ type: 'tsvector', nullable: true })
  tsv: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @Column({ name: 'content_hash' })
  contentHash: string;

  @Column({ default: 'v1' })
  version: string;
}
