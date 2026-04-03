import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Req, Res, UseGuards, HttpException, HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { MastraService } from '../agent/mastra.service';
import { TokenQuotaGuard } from '../quota/guards/token-quota.guard';
import { TokenUsageService } from '../quota/token-usage.service';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly mastraService: MastraService,
    private readonly tokenUsageService: TokenUsageService,
  ) {}

  @Get()
  async list(@Req() req: Request) {
    const user = req.user as { id: string };
    return this.chatService.listConversations(user.id);
  }

  @Post()
  async create(@Req() req: Request, @Body() body: { articleSlug?: string }) {
    const user = req.user as { id: string };
    return this.chatService.createConversation(user.id, body.articleSlug);
  }

  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { id: string };
    const deleted = await this.chatService.deleteConversation(id, user.id);
    if (!deleted) throw new HttpException('Not found', HttpStatus.NOT_FOUND);
    return { ok: true };
  }

  @Patch(':id')
  async update(@Req() req: Request, @Param('id') id: string, @Body() body: { title?: string }) {
    const user = req.user as { id: string };
    const conv = await this.chatService.updateConversation(id, user.id, body);
    if (!conv) throw new HttpException('Not found', HttpStatus.NOT_FOUND);
    return conv;
  }

  @Get(':id/messages')
  async getMessages(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { id: string };
    const conv = await this.chatService.getConversation(id, user.id);
    if (!conv) throw new HttpException('Not found', HttpStatus.NOT_FOUND);
    return this.chatService.getMessages(id);
  }

  @Patch(':id/messages/:msgId')
  async updateMessage(
    @Req() req: Request, @Param('id') id: string, @Param('msgId') msgId: string,
    @Body() body: { content: string },
  ) {
    const user = req.user as { id: string };
    const conv = await this.chatService.getConversation(id, user.id);
    if (!conv) throw new HttpException('Not found', HttpStatus.NOT_FOUND);
    const msg = await this.chatService.updateMessage(id, msgId, body.content);
    if (!msg) throw new HttpException('Message not found', HttpStatus.NOT_FOUND);
    return msg;
  }

  @Delete(':id/messages/:msgId/after')
  async deleteMessagesAfter(
    @Req() req: Request, @Param('id') id: string, @Param('msgId') msgId: string,
  ) {
    const user = req.user as { id: string };
    const conv = await this.chatService.getConversation(id, user.id);
    if (!conv) throw new HttpException('Not found', HttpStatus.NOT_FOUND);
    const count = await this.chatService.deleteMessagesAfter(id, msgId);
    return { deleted: count };
  }

  @Post(':id/messages')
  @UseGuards(TokenQuotaGuard)
  async sendMessage(
    @Req() req: Request, @Res() res: Response,
    @Param('id') id: string,
    @Body() body: { content: string; context?: { articleSlug?: string; selectedText?: string; articleContent?: string }; skipUserMessage?: boolean },
  ) {
    const user = req.user as { id: string };
    const conv = await this.chatService.getConversation(id, user.id);
    if (!conv) throw new HttpException('Not found', HttpStatus.NOT_FOUND);

    if (!body.skipUserMessage) {
      await this.chatService.saveMessage(id, 'user', body.content, { context: body.context });
    }

    const messages = await this.chatService.getMessages(id);
    const conversationMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let fullResponse = '';
    let tokenUsage = { inputTokens: 0, outputTokens: 0 };
    try {
      for await (const event of this.mastraService.run(conversationMessages, {
        articleSlug: body.context?.articleSlug,
        articleContent: body.context?.articleContent,
        selectedText: body.context?.selectedText,
      })) {
        if (event.type === 'done') {
          tokenUsage = event.usage;
        } else {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        }
        if (event.type === 'text_delta') fullResponse += event.delta;
      }

      await this.chatService.saveMessage(id, 'assistant', fullResponse);

      // Record token usage
      await this.tokenUsageService.record({
        userId: user.id,
        conversationId: id,
        inputTokens: tokenUsage.inputTokens,
        outputTokens: tokenUsage.outputTokens,
        provider: 'default',
        model: 'default',
      });

      if (messages.length <= 1 && !conv.title) {
        const title = body.content.slice(0, 50) + (body.content.length > 50 ? '...' : '');
        await this.chatService.updateConversation(id, user.id, { title });
      }

      res.write(`data: [DONE]\n\n`);
    } catch (error) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: (error as Error).message })}\n\n`);
    } finally {
      res.end();
    }
  }
}
