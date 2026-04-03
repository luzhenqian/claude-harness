import { Module, Injectable } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { User } from './entities/user.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GithubStrategy } from './strategies/github.strategy';
import { GoogleStrategy } from './strategies/google.strategy';

@Injectable()
class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('JWT_SECRET', 'changeme'),
    });
  }
  validate(payload: { sub: string; name: string }) {
    return { id: payload.sub, name: payload.name };
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {
  static register() {
    const providers: any[] = [AuthService, JwtStrategy];
    if (process.env.GITHUB_CLIENT_ID) providers.push(GithubStrategy);
    if (process.env.GOOGLE_CLIENT_ID) providers.push(GoogleStrategy);
    return {
      module: AuthModule,
      imports: [
        TypeOrmModule.forFeature([User]),
        PassportModule,
        JwtModule.registerAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            secret: config.get('JWT_SECRET'),
            signOptions: { expiresIn: '7d' },
          }),
        }),
      ],
      controllers: [AuthController],
      providers,
      exports: [AuthService],
    };
  }
}
