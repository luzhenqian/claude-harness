import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('llm_providers')
export class LlmProvider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  type: string;

  @Column()
  model: string;

  @Column({ name: 'api_key' })
  apiKey: string;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ type: 'jsonb', default: {} })
  config: Record<string, unknown>;

  @Column({ default: true })
  enabled: boolean;
}
