import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from './entities/user.entity';

export interface OAuthProfile {
  provider: string;
  providerId: string;
  name: string;
  email: string;
  avatarUrl: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async validateOAuthUser(profile: OAuthProfile): Promise<User> {
    let user = await this.userRepo.findOne({
      where: { provider: profile.provider, providerId: profile.providerId },
    });
    if (!user) {
      user = this.userRepo.create({
        provider: profile.provider,
        providerId: profile.providerId,
        name: profile.name,
        email: profile.email,
        avatarUrl: profile.avatarUrl,
      });
      user = await this.userRepo.save(user);
    } else if (profile.avatarUrl && user.avatarUrl !== profile.avatarUrl) {
      user.avatarUrl = profile.avatarUrl;
      user = await this.userRepo.save(user);
    }
    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  generateToken(user: User): string {
    return this.jwtService.sign({ sub: user.id, name: user.name });
  }
}
