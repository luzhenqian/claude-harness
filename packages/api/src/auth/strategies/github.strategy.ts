import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private readonly authService: AuthService, configService: ConfigService) {
    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID', 'not-configured'),
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET', 'not-configured'),
      callbackURL: configService.get<string>('GITHUB_CALLBACK_URL', 'http://localhost:3001/auth/github/callback'),
      scope: ['user:email'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile): Promise<any> {
    return this.authService.validateOAuthUser({
      provider: 'github',
      providerId: profile.id,
      name: profile.displayName || profile.username || '',
      email: profile.emails?.[0]?.value || '',
      avatarUrl: profile.photos?.[0]?.value || '',
    });
  }
}
