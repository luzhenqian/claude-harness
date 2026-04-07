import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { LlmService } from '../llm/llm.service';
import { Message as LlmMessage } from '../llm/llm-provider.interface';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation) private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Message) private readonly msgRepo: Repository<Message>,
    private readonly llmService: LlmService,
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

  async updateMessage(conversationId: string, messageId: string, content: string): Promise<Message | null> {
    const msg = await this.msgRepo.findOne({ where: { id: messageId, conversationId } });
    if (!msg) return null;
    msg.content = content;
    return this.msgRepo.save(msg);
  }

  async deleteMessagesAfter(conversationId: string, messageId: string): Promise<number> {
    const msg = await this.msgRepo.findOne({ where: { id: messageId, conversationId } });
    if (!msg) return 0;
    const result = await this.msgRepo
      .createQueryBuilder()
      .delete()
      .from(Message)
      .where('conversation_id = :conversationId', { conversationId })
      .andWhere('created_at > :createdAt', { createdAt: msg.createdAt })
      .execute();
    return result.affected || 0;
  }

  async generateTitle(userMessage: string, assistantMessage: string): Promise<string> {
    const provider = await this.llmService.getTitleProvider();
    const messages: LlmMessage[] = [
      {
        role: 'system',
        content: '根据以下对话的第一轮内容，生成一个简短的标题（10个字以内）。直接输出标题文本，不要加引号、标点或其他格式。',
      },
      { role: 'user', content: userMessage },
      { role: 'assistant', content: assistantMessage },
      { role: 'user', content: '请为以上对话生成一个简短标题。' },
    ];

    let title = '';
    for await (const chunk of provider.chat(messages)) {
      if (chunk.type === 'text_delta') {
        title += chunk.delta;
      }
    }
    return title.trim();
  }
}
