import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('code_chunks')
export class CodeChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'file_path' })
  filePath: string;

  @Column({ name: 'chunk_type' })
  chunkType: string;

  @Column()
  name: string;

  @Column('text')
  content: string;

  @Column({ name: 'start_line', type: 'int' })
  startLine: number;

  @Column({ name: 'end_line', type: 'int' })
  endLine: number;

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
