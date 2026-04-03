import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1712102400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider VARCHAR NOT NULL,
        provider_id VARCHAR NOT NULL,
        email VARCHAR,
        name VARCHAR NOT NULL,
        avatar_url VARCHAR,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (provider, provider_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR,
        article_slug VARCHAR,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_conversations_user_updated ON conversations (user_id, updated_at DESC)`);

    await queryRunner.query(`
      CREATE TABLE messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role VARCHAR NOT NULL,
        content TEXT NOT NULL,
        tool_calls JSONB,
        tool_name VARCHAR,
        context JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_messages_conversation_created ON messages (conversation_id, created_at ASC)`);

    await queryRunner.query(`
      CREATE TABLE llm_providers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR NOT NULL,
        type VARCHAR NOT NULL,
        model VARCHAR NOT NULL,
        api_key VARCHAR NOT NULL,
        base_url VARCHAR,
        is_default BOOLEAN NOT NULL DEFAULT false,
        config JSONB NOT NULL DEFAULT '{}',
        enabled BOOLEAN NOT NULL DEFAULT true
      )
    `);

    await queryRunner.query(`
      CREATE TABLE code_chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        file_path VARCHAR NOT NULL,
        chunk_type VARCHAR NOT NULL,
        name VARCHAR NOT NULL,
        content TEXT NOT NULL,
        start_line INT NOT NULL,
        end_line INT NOT NULL,
        embedding vector(1536),
        tsv TSVECTOR,
        metadata JSONB NOT NULL DEFAULT '{}',
        content_hash VARCHAR NOT NULL,
        version VARCHAR NOT NULL DEFAULT 'v1'
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_code_chunks_embedding ON code_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`);
    await queryRunner.query(`CREATE INDEX idx_code_chunks_tsv ON code_chunks USING gin (tsv)`);
    await queryRunner.query(`CREATE INDEX idx_code_chunks_file_path ON code_chunks (file_path)`);

    await queryRunner.query(`
      CREATE TABLE article_chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        article_slug VARCHAR NOT NULL,
        locale VARCHAR NOT NULL,
        heading VARCHAR NOT NULL,
        content TEXT NOT NULL,
        embedding vector(1536),
        tsv TSVECTOR,
        metadata JSONB NOT NULL DEFAULT '{}',
        content_hash VARCHAR NOT NULL,
        version VARCHAR NOT NULL DEFAULT 'v1'
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_article_chunks_embedding ON article_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50)`);
    await queryRunner.query(`CREATE INDEX idx_article_chunks_tsv ON article_chunks USING gin (tsv)`);
    await queryRunner.query(`CREATE INDEX idx_article_chunks_slug_locale ON article_chunks (article_slug, locale)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS article_chunks');
    await queryRunner.query('DROP TABLE IF EXISTS code_chunks');
    await queryRunner.query('DROP TABLE IF EXISTS llm_providers');
    await queryRunner.query('DROP TABLE IF EXISTS messages');
    await queryRunner.query('DROP TABLE IF EXISTS conversations');
    await queryRunner.query('DROP TABLE IF EXISTS users');
  }
}
