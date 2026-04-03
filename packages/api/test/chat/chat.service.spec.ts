import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatService } from '../../src/chat/chat.service';
import { Repository } from 'typeorm';
import { Conversation } from '../../src/chat/entities/conversation.entity';
import { Message } from '../../src/chat/entities/message.entity';

describe('ChatService', () => {
  let service: ChatService;
  let convRepo: Repository<Conversation>;
  let msgRepo: Repository<Message>;

  beforeEach(() => {
    convRepo = {
      create: vi.fn().mockReturnValue({ id: 'conv-1', userId: 'user-1', title: null }),
      save: vi.fn().mockImplementation((c) => Promise.resolve({ ...c, id: 'conv-1' })),
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue({ id: 'conv-1', userId: 'user-1' }),
      delete: vi.fn().mockResolvedValue({ affected: 1 }),
    } as any;
    msgRepo = {
      create: vi.fn().mockImplementation((data) => data),
      save: vi.fn().mockImplementation((m) => Promise.resolve({ ...m, id: 'msg-1' })),
      find: vi.fn().mockResolvedValue([]),
    } as any;
    service = new ChatService(convRepo, msgRepo);
  });

  it('should create a conversation', async () => {
    const conv = await service.createConversation('user-1', 'query-engine');
    expect(convRepo.create).toHaveBeenCalledWith({ userId: 'user-1', articleSlug: 'query-engine' });
    expect(conv).toHaveProperty('id');
  });

  it('should list conversations for a user', async () => {
    await service.listConversations('user-1');
    expect(convRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-1' } }));
  });

  it('should save a message', async () => {
    const msg = await service.saveMessage('conv-1', 'user', 'Hello');
    expect(msgRepo.create).toHaveBeenCalled();
    expect(msg).toHaveProperty('content', 'Hello');
  });

  it('should get messages for a conversation', async () => {
    await service.getMessages('conv-1');
    expect(msgRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: { conversationId: 'conv-1' } }));
  });
});
