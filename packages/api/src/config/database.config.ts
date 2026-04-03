import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

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
      migrations: ['dist/migrations/*.js'],
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
    migrations: ['dist/migrations/*.js'],
  };
};
