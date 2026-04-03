import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../auth/entities/user.entity';
import { Conversation } from '../../chat/entities/conversation.entity';

@Entity('token_usages')
@Index(['userId', 'createdAt'])
export class TokenUsage {
  @ApiProperty({ description: 'Usage record UUID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'User ID' })
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({ description: 'Conversation ID' })
  @Column({ name: 'conversation_id' })
  conversationId: string;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @ApiProperty({ description: 'Input token count' })
  @Column({ name: 'input_tokens', type: 'integer', default: 0 })
  inputTokens: number;

  @ApiProperty({ description: 'Output token count' })
  @Column({ name: 'output_tokens', type: 'integer', default: 0 })
  outputTokens: number;

  @ApiProperty({ description: 'LLM provider name' })
  @Column()
  provider: string;

  @ApiProperty({ description: 'Model identifier' })
  @Column()
  model: string;

  @ApiProperty({ description: 'Record creation timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
