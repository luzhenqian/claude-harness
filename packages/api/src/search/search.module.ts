import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { IndexModule } from '../index/index.module';

@Module({
  imports: [IndexModule],
  controllers: [SearchController],
})
export class SearchModule {}
