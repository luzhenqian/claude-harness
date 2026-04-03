import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique, OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Conversation } from '../../chat/entities/conversation.entity';

@Entity('users')
@Unique(['provider', 'providerId'])
export class User {
  @ApiProperty({ description: 'User UUID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'OAuth provider name', example: 'github' })
  @Column()
  provider: string;

  @ApiProperty({ description: 'Provider-specific user ID' })
  @Column({ name: 'provider_id' })
  providerId: string;

  @ApiProperty({ description: 'User email', required: false })
  @Column({ nullable: true })
  email: string;

  @ApiProperty({ description: 'Display name' })
  @Column()
  name: string;

  @ApiProperty({ description: 'Avatar URL', required: false })
  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string;

  @ApiProperty({ description: 'Account creation timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Conversation, (c) => c.user)
  conversations: Conversation[];
}
