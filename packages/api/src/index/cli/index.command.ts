import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { IndexService } from '../index.service';
import { join } from 'path';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const indexService = app.get(IndexService);

  const args = process.argv.slice(2);
  const command = args[0];
  const force = args.includes('--force');

  const projectRoot = join(__dirname, '..', '..', '..', '..', '..');
  const sourceRoot = join(projectRoot, 'packages', 'claude-code-source', 'src');
  const articlesRoot = join(projectRoot, 'content', 'articles');

  console.log(`Indexing mode: ${command || 'all'}, force: ${force}`);

  if (command === 'code' || command === 'all' || !command) {
    console.log('Indexing source code...');
    const result = await indexService.indexCode(sourceRoot, force);
    console.log(`Code: ${result.processed} processed, ${result.skipped} skipped`);
  }

  if (command === 'articles' || command === 'all' || !command) {
    console.log('Indexing articles...');
    const result = await indexService.indexArticles(articlesRoot, force);
    console.log(`Articles: ${result.processed} processed, ${result.skipped} skipped`);
  }

  await app.close();
}

main().catch(console.error);
