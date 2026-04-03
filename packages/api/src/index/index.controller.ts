import { Controller, Post, Get, Query } from '@nestjs/common';
import { IndexService } from './index.service';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';

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
  async indexCode(@Query('force') force?: string) {
    return this.indexService.indexCode(this.sourceRoot, force === 'true');
  }

  @Post('articles')
  async indexArticles(@Query('force') force?: string) {
    return this.indexService.indexArticles(this.articlesRoot, force === 'true');
  }

  @Get('status')
  async getStatus() { return this.indexService.getStatus(); }
}
