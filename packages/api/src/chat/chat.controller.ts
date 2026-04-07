import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Req, Res, UseGuards, HttpException, HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse, ApiNotFoundResponse,
  ApiParam, ApiBody,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { MastraService } from '../agent/mastra.service';
import { TokenQuotaGuard } from '../quota/guards/token-quota.guard';
import { TokenUsageService } from '../quota/token-usage.service';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

@ApiTags('Conversations')
@ApiBearerAuth()
@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly mastraService: MastraService,
    private readonly tokenUsageService: TokenUsageService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all conversations for the current user' })
  @ApiOkResponse({ type: [Conversation] })
  async list(@Req() req: Request) {
    const user = req.user as { id: string };
    return this.chatService.listConversations(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiBody({ schema: { properties: { articleSlug: { type: 'string', description: 'Optional article slug to associate' } } } })
  @ApiOkResponse({ type: Conversation })
  async create(@Req() req: Request, @Body() body: { articleSlug?: string }) {
    const user = req.user as { id: string };
    return this.chatService.createConversation(user.id, body.articleSlug);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiNotFoundResponse({ description: 'Conversation not found' })
  async remove(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { id: string };
    const deleted = await this.chatService.deleteConversation(id, user.id);
    if (!deleted) throw new HttpException('Not found', HttpStatus.NOT_FOUND);
    return { ok: true };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update conversation (e.g. rename)' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiBody({ schema: { properties: { title: { type: 'string' } } } })
  @ApiOkResponse({ type: Conversation })
  @ApiNotFoundResponse({ description: 'Conversation not found' })
  async update(@Req() req: Request, @Param('id') id: string, @Body() body: { title?: string }) {
    const user = req.user as { id: string };
    const conv = await this.chatService.updateConversation(id, user.id, body);
    if (!conv) throw new HttpException('Not found', HttpStatus.NOT_FOUND);
    return conv;
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get all messages in a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiOkResponse({ type: [Message] })
  @ApiNotFoundResponse({ description: 'Conversation not found' })
  async getMessages(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { id: string };
    const conv = await this.chatService.getConversation(id, user.id);
    if (!conv) throw new HttpException('Not found', HttpStatus.NOT_FOUND);
    return this.chatService.getMessages(id);
  }

  @Patch(':id/messages/:msgId')
  @ApiOperation({ summary: 'Update a message content' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiParam({ name: 'msgId', description: 'Message ID' })
  @ApiBody({ schema: { properties: { content: { type: 'string' } }, required: ['content'] } })
  @ApiOkResponse({ type: Message })
  @ApiNotFoundResponse({ description: 'Conversation or message not found' })
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
  @ApiOperation({ summary: 'Delete all messages after a given message (for regeneration)' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiParam({ name: 'msgId', description: 'Message ID (messages after this will be deleted)' })
  @ApiOkResponse({ schema: { properties: { deleted: { type: 'number' } } } })
  @ApiNotFoundResponse({ description: 'Conversation not found' })
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
  @ApiOperation({ summary: 'Send a message and stream AI response (SSE)' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiBody({
    schema: {
      properties: {
        content: { type: 'string', description: 'User message content' },
        context: {
          type: 'object',
          properties: {
            articleSlug: { type: 'string' },
            selectedText: { type: 'string' },
            articleContent: { type: 'string' },
          },
        },
        skipUserMessage: { type: 'boolean', description: 'Skip saving the user message (for regeneration)' },
      },
      required: ['content'],
    },
  })
  @ApiNotFoundResponse({ description: 'Conversation not found' })
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
        // 设置临时标题
        const tempTitle = body.content.slice(0, 50) + (body.content.length > 50 ? '...' : '');
        await this.chatService.updateConversation(id, user.id, { title: tempTitle });

        // 异步生成 AI 标题，不阻塞响应
        this.chatService.generateTitle(body.content, fullResponse).then(async (aiTitle) => {
          if (aiTitle) {
            await this.chatService.updateConversation(id, user.id, { title: aiTitle });
          }
        }).catch((err) => {
          this.logger.warn(`Failed to generate AI title for conversation ${id}: ${err.message}`);
        });
      }

      res.write(`data: [DONE]\n\n`);
    } catch (error) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: (error as Error).message })}\n\n`);
    } finally {
      res.end();
    }
  }
}
