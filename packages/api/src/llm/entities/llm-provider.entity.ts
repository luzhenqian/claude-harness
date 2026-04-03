import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('llm_providers')
export class LlmProvider {
  @ApiProperty({ description: 'Provider UUID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Provider display name' })
  @Column()
  name: string;

  @ApiProperty({ description: 'Provider type', example: 'openai' })
  @Column()
  type: string;

  @ApiProperty({ description: 'Model identifier', example: 'gpt-4o' })
  @Column()
  model: string;

  @ApiProperty({ description: 'API key' })
  @Column({ name: 'api_key' })
  apiKey: string;

  @ApiProperty({ description: 'Custom base URL', required: false })
  @Column({ name: 'base_url', nullable: true })
  baseUrl: string;

  @ApiProperty({ description: 'Whether this is the default provider' })
  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @ApiProperty({ description: 'Additional provider configuration' })
  @Column({ type: 'jsonb', default: {} })
  config: Record<string, unknown>;

  @ApiProperty({ description: 'Whether the provider is enabled' })
  @Column({ default: true })
  enabled: boolean;
}
