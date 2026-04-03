import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiOkResponse, ApiBadRequestResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { readFile } from 'fs/promises';
import { join, resolve } from 'path';

@ApiTags('Source')
@Controller('source')
export class SourceController {
  private readonly sourceRoot: string;

  constructor() {
    const apiRoot = process.cwd();
    const projectRoot = join(apiRoot, '..', '..');
    this.sourceRoot = join(projectRoot, 'packages', 'claude-code-source', 'src');
  }

  @Get()
  @ApiOperation({ summary: 'Read source file content' })
  @ApiQuery({ name: 'file', description: 'Relative file path within the source package' })
  @ApiOkResponse({
    schema: {
      properties: {
        code: { type: 'string' },
        filePath: { type: 'string' },
        lines: { type: 'number' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Missing or invalid file path' })
  @ApiNotFoundResponse({ description: 'File not found' })
  async getSource(@Query('file') filePath: string) {
    if (!filePath) throw new HttpException('Missing file param', HttpStatus.BAD_REQUEST);
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
