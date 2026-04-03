import {
  Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('system_configs')
export class SystemConfig {
  @ApiProperty({ description: 'Config UUID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Configuration key', example: 'daily_token_quota' })
  @Column({ unique: true })
  key: string;

  @ApiProperty({ description: 'Configuration value (JSON)' })
  @Column({ type: 'jsonb', default: {} })
  value: Record<string, any>;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
