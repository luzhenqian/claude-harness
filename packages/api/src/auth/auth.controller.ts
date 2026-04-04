import { Controller, Get, Post, Req, Res, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from './entities/user.entity';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('github')
  @ApiOperation({ summary: 'Initiate GitHub OAuth login' })
  @UseGuards(AuthGuard('github'))
  githubLogin() {}

  @Get('github/callback')
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard('github'))
  githubCallback(@Req() req: Request, @Res() res: Response) {
    const token = this.authService.generateToken(req.user as any);
    const frontendUrl = this.configService.get('FRONTEND_URL');
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }

  @Get('google')
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @UseGuards(AuthGuard('google'))
  googleLogin() {}

  @Get('google/callback')
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: Request, @Res() res: Response) {
    const token = this.authService.generateToken(req.user as any);
    const frontendUrl = this.configService.get('FRONTEND_URL');
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiOkResponse({ type: User })
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req: Request) {
    const { id } = req.user as any;
    return this.authService.findById(id);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout' })
  @ApiOkResponse({ schema: { properties: { ok: { type: 'boolean' } } } })
  @HttpCode(200)
  logout() {
    return { ok: true };
  }
}
