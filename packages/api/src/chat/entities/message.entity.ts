import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Conversation } from './conversation.entity';

@Entity('messages')
@Index(['conversationId', 'createdAt'])
export class Message {
  @ApiProperty({ description: 'Message UUID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Parent conversation ID' })
  @Column({ name: 'conversation_id' })
  conversationId: string;

  @ManyToOne(() => Conversation, (c) => c.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @ApiProperty({ description: 'Message role', example: 'user', enum: ['user', 'assistant', 'tool'] })
  @Column()
  role: string;

  @ApiProperty({ description: 'Message content' })
  @Column('text')
  content: string;

  @ApiProperty({ description: 'Tool call payloads', required: false, nullable: true })
  @Column({ name: 'tool_calls', type: 'jsonb', nullable: true })
  toolCalls: Record<string, unknown>[] | null;

  @ApiProperty({ description: 'Tool name if role is tool', required: false })
  @Column({ name: 'tool_name', nullable: true })
  toolName: string;

  @ApiProperty({ description: 'Additional context metadata', required: false, nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  context: Record<string, unknown> | null;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
