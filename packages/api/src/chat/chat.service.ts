import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation) private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Message) private readonly msgRepo: Repository<Message>,
  ) {}

  async createConversation(userId: string, articleSlug?: string): Promise<Conversation> {
    const conv = this.convRepo.create({ userId, articleSlug });
    return this.convRepo.save(conv);
  }

  async listConversations(userId: string): Promise<Conversation[]> {
    return this.convRepo.find({ where: { userId }, order: { updatedAt: 'DESC' } });
  }

  async getConversation(id: string, userId: string): Promise<Conversation | null> {
    return this.convRepo.findOne({ where: { id, userId } });
  }

  async updateConversation(id: string, userId: string, data: Partial<Pick<Conversation, 'title'>>): Promise<Conversation | null> {
    const conv = await this.convRepo.findOne({ where: { id, userId } });
    if (!conv) return null;
    Object.assign(conv, data);
    return this.convRepo.save(conv);
  }

  async deleteConversation(id: string, userId: string): Promise<boolean> {
    const result = await this.convRepo.delete({ id, userId });
    return (result.affected || 0) > 0;
  }

  async saveMessage(conversationId: string, role: string, content: string,
    extra?: { toolCalls?: any[]; toolName?: string; context?: any }): Promise<Message> {
    const msg = this.msgRepo.create({
      conversationId, role, content,
      toolCalls: extra?.toolCalls ?? undefined,
      toolName: extra?.toolName ?? undefined,
      context: extra?.context ?? undefined,
    });
    return this.msgRepo.save(msg) as Promise<Message>;
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    return this.msgRepo.find({ where: { conversationId }, order: { createdAt: 'ASC' } });
  }
}
