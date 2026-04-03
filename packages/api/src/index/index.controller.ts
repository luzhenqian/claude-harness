import { Controller, Post, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiOkResponse } from '@nestjs/swagger';
import { IndexService } from './index.service';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';

@ApiTags('Admin - Indexing')
@Controller('admin/index')
export class IndexController {
  private readonly sourceRoot: string;
  private readonly articlesRoot: string;

  constructor(private readonly indexService: IndexService, private readonly configService: ConfigService) {
    const projectRoot = join(__dirname, '..', '..', '..', '..');
    this.sourceRoot = join(projectRoot, 'packages', 'claude-code-source', 'src');
    this.articlesRoot = join(projectRoot, 'content', 'articles');
  }

  @Post('code')
  @ApiOperation({ summary: 'Trigger code indexing' })
  @ApiQuery({ name: 'force', required: false, description: 'Force re-index all chunks' })
  async indexCode(@Query('force') force?: string) {
    return this.indexService.indexCode(this.sourceRoot, force === 'true');
  }

  @Post('articles')
  @ApiOperation({ summary: 'Trigger article indexing' })
  @ApiQuery({ name: 'force', required: false, description: 'Force re-index all chunks' })
  async indexArticles(@Query('force') force?: string) {
    return this.indexService.indexArticles(this.articlesRoot, force === 'true');
  }

  @Get('status')
  @ApiOperation({ summary: 'Get indexing status (chunk counts)' })
  async getStatus() { return this.indexService.getStatus(); }
}
