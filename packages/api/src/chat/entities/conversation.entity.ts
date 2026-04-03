import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, JoinColumn, Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../auth/entities/user.entity';
import { Message } from './message.entity';

@Entity('conversations')
@Index(['userId', 'updatedAt'])
export class Conversation {
  @ApiProperty({ description: 'Conversation UUID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Owner user ID' })
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (u) => u.conversations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({ description: 'Conversation title', required: false })
  @Column({ nullable: true })
  title: string;

  @ApiProperty({ description: 'Associated article slug', required: false })
  @Column({ name: 'article_slug', nullable: true })
  articleSlug: string;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Message, (m) => m.conversation)
  messages: Message[];
}
