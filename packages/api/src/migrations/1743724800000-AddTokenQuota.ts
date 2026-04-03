import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTokenQuota1743724800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE token_usages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        input_tokens INTEGER NOT NULL DEFAULT 0,
        output_tokens INTEGER NOT NULL DEFAULT 0,
        provider VARCHAR NOT NULL,
        model VARCHAR NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_token_usages_user_created ON token_usages (user_id, created_at)`);

    await queryRunner.query(`
      CREATE TABLE system_configs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR NOT NULL UNIQUE,
        value JSONB NOT NULL DEFAULT '{}',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      INSERT INTO system_configs (key, value) VALUES (
        'token_limits',
        '{"dailyInputTokens": 500000, "dailyOutputTokens": 100000, "estimatedOutputTokens": 4096}'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS token_usages');
    await queryRunner.query('DROP TABLE IF EXISTS system_configs');
  }
}
