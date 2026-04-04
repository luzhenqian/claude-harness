import 'dotenv/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { InitialSchema1712102400000 } from '../migrations/1712102400000-InitialSchema';
import { AddTokenQuota1743724800000 } from '../migrations/1743724800000-AddTokenQuota';

const migrations = [InitialSchema1712102400000, AddTokenQuota1743724800000];

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const url = configService.get('DATABASE_URL');

  if (url) {
    return {
      type: 'postgres',
      url,
      autoLoadEntities: true,
      synchronize: false,
      migrations,
    };
  }

  return {
    type: 'postgres',
    host: configService.get('DATABASE_HOST', 'localhost'),
    port: configService.get<number>('DATABASE_PORT', 5432),
    database: configService.get('DATABASE_NAME', 'claude_harness'),
    username: configService.get('DATABASE_USER', 'postgres'),
    password: configService.get('DATABASE_PASSWORD', 'postgres'),
    autoLoadEntities: true,
    synchronize: false,
    migrations,
  };
};

// Standalone DataSource for TypeORM CLI (migration:run, migration:generate)
export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ...(!process.env.DATABASE_URL ? {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    database: process.env.DATABASE_NAME || 'claude_harness',
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
  } : {}),
  entities: ['src/**/*.entity.ts'],
  migrations,
});
