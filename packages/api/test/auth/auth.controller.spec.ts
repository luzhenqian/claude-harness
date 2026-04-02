import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../../src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from '../../src/auth/entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: Repository<User>;
  let jwtService: JwtService;

  beforeEach(() => {
    userRepo = {
      findOne: vi.fn(),
      create: vi.fn(),
      save: vi.fn(),
    } as any;

    jwtService = {
      sign: vi.fn().mockReturnValue('mock-jwt-token'),
    } as any;

    service = new AuthService(userRepo, jwtService);
  });

  it('should create a new user on first OAuth login', async () => {
    vi.mocked(userRepo.findOne).mockResolvedValue(null);
    vi.mocked(userRepo.create).mockReturnValue({
      id: 'uuid-1', provider: 'github', providerId: '12345',
      name: 'Test User', email: 'test@example.com', avatarUrl: 'https://avatar.url',
    } as User);
    vi.mocked(userRepo.save).mockResolvedValue({
      id: 'uuid-1', provider: 'github', providerId: '12345', name: 'Test User',
    } as User);

    const result = await service.validateOAuthUser({
      provider: 'github', providerId: '12345', name: 'Test User',
      email: 'test@example.com', avatarUrl: 'https://avatar.url',
    });

    expect(userRepo.create).toHaveBeenCalled();
    expect(userRepo.save).toHaveBeenCalled();
    expect(result).toHaveProperty('id');
  });

  it('should return existing user on repeat OAuth login', async () => {
    const existingUser = { id: 'uuid-1', provider: 'github', providerId: '12345', name: 'Test User' } as User;
    vi.mocked(userRepo.findOne).mockResolvedValue(existingUser);

    const result = await service.validateOAuthUser({
      provider: 'github', providerId: '12345', name: 'Test User',
      email: 'test@example.com', avatarUrl: 'https://avatar.url',
    });

    expect(userRepo.create).not.toHaveBeenCalled();
    expect(result.id).toBe('uuid-1');
  });

  it('should generate a JWT token', () => {
    const token = service.generateToken({ id: 'uuid-1', name: 'Test' } as User);
    expect(jwtService.sign).toHaveBeenCalledWith({ sub: 'uuid-1', name: 'Test' });
    expect(token).toBe('mock-jwt-token');
  });
});
