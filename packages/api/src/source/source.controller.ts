import { Controller, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join, resolve } from 'path';

@Controller('source')
export class SourceController {
  private readonly sourceRoot: string;

  constructor() {
    const apiRoot = process.cwd();
    const projectRoot = join(apiRoot, '..', '..');
    this.sourceRoot = join(projectRoot, 'packages', 'claude-code-source', 'src');
  }

  @Get(':filePath(*)')
  async getSource(@Param('filePath') filePath: string) {
    const fullPath = resolve(join(this.sourceRoot, filePath));
    if (!fullPath.startsWith(resolve(this.sourceRoot))) {
      throw new HttpException('Invalid path', HttpStatus.BAD_REQUEST);
    }
    try {
      const code = await readFile(fullPath, 'utf-8');
      return { code, filePath, lines: code.split('\n').length };
    } catch {
      throw new HttpException(`File not found: ${filePath}`, HttpStatus.NOT_FOUND);
    }
  }
}
