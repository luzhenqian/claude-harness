import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique, OneToMany,
} from 'typeorm';
import { Conversation } from '../../chat/entities/conversation.entity';

@Entity('users')
@Unique(['provider', 'providerId'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  provider: string;

  @Column({ name: 'provider_id' })
  providerId: string;

  @Column({ nullable: true })
  email: string;

  @Column()
  name: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Conversation, (c) => c.user)
  conversations: Conversation[];
}
