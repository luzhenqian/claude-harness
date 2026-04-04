import { Controller, Get, Query, HttpException, HttpStatus, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiOkResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { SearchService, CodeSearchResult, ArticleSearchResult } from '../index/search.service';

export interface SearchResponse {
  code: CodeSearchResult[];
  articles: ArticleSearchResult[];
}

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Unified search across code and articles' })
  @ApiQuery({ name: 'q', description: 'Search query (min 2 chars)', required: true })
  @ApiQuery({ name: 'locale', description: 'Locale for article filtering', required: false })
  @ApiQuery({ name: 'limit', description: 'Max results per category', required: false, type: 'integer' })
  @ApiOkResponse({ description: 'Search results grouped by category' })
  @ApiBadRequestResponse({ description: 'Query too short' })
  async search(
    @Query('q') q: string,
    @Query('locale') locale: string = 'en',
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  ): Promise<SearchResponse> {
    if (!q || q.length < 2) {
      throw new HttpException('Query must be at least 2 characters', HttpStatus.BAD_REQUEST);
    }

    const clampedLimit = Math.min(limit, 50);

    const [code, articles] = await Promise.all([
      this.searchService.searchCode(q, clampedLimit),
      this.searchService.searchArticles(q, clampedLimit, locale),
    ]);

    return { code, articles };
  }
}
