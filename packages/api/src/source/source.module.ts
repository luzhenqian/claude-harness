import { Module } from '@nestjs/common';
import { SourceController } from './source.controller';

@Module({
  controllers: [SourceController],
})
export class SourceModule {}
