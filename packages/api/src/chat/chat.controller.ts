import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Req, Res, UseGuards, HttpException, HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { AgentService } from '../agent/agent.service';
import { SearchService } from '../index/search.service';
import { SearchCodeTool } from '../agent/tools/search-code.tool';
import { ReadFileTool } from '../agent/tools/read-file.tool';
import { SearchArticlesTool } from '../agent/tools/search-articles.tool';
import { GetArticleTool } from '../agent/tools/get-article.tool';
import { Message as LLMMessage } from '../llm/llm-provider.interface';
import { join } from 'path';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ChatController {
  private readonly sourceRoot: string;
  private readonly articlesRoot: string;

  constructor(
    private readonly chatService: ChatService,
    private readonly agentService: AgentService,
    private readonly searchService: SearchService,
  ) {
    const projectRoot = join(__dirname, '..', '..', '..', '..');
    this.sourceRoot = join(projectRoot, 'packages', 'claude-code-source', 'src');
    this.articlesRoot = join(projectRoot, 'content', 'articles');
  }

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
  async sendMessage(
    @Req() req: Request, @Res() res: Response,
    @Param('id') id: string,
    @Body() body: { content: string; context?: { articleSlug?: string; selectedText?: string; articleContent?: string } },
  ) {
    const user = req.user as { id: string };
    const conv = await this.chatService.getConversation(id, user.id);
    if (!conv) throw new HttpException('Not found', HttpStatus.NOT_FOUND);

    await this.chatService.saveMessage(id, 'user', body.content, { context: body.context });

    const messages = await this.chatService.getMessages(id);
    const llmMessages: LLMMessage[] = messages.map((m) => ({
      role: m.role as any, content: m.content,
      toolCallId: m.toolName ? m.id : undefined,
      toolCalls: m.toolCalls as any,
    }));

    const tools = [
      new SearchCodeTool(this.searchService),
      new ReadFileTool(this.sourceRoot),
      new SearchArticlesTool(this.searchService),
      new GetArticleTool(this.articlesRoot),
    ];

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let fullResponse = '';
    try {
      for await (const chunk of this.agentService.run(llmMessages, tools, {
        articleSlug: body.context?.articleSlug,
        articleContent: body.context?.articleContent,
        selectedText: body.context?.selectedText,
      })) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        if (chunk.type === 'text_delta') fullResponse += chunk.delta;
      }

      await this.chatService.saveMessage(id, 'assistant', fullResponse);

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
