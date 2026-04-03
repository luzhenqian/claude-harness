import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('code_chunks')
export class CodeChunk {
  @ApiProperty({ description: 'Chunk UUID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Source file path' })
  @Column({ name: 'file_path' })
  filePath: string;

  @ApiProperty({ description: 'Chunk type', example: 'function' })
  @Column({ name: 'chunk_type' })
  chunkType: string;

  @ApiProperty({ description: 'Symbol name' })
  @Column()
  name: string;

  @ApiProperty({ description: 'Code content' })
  @Column('text')
  content: string;

  @ApiProperty({ description: 'Start line number' })
  @Column({ name: 'start_line', type: 'int' })
  startLine: number;

  @ApiProperty({ description: 'End line number' })
  @Column({ name: 'end_line', type: 'int' })
  endLine: number;

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
