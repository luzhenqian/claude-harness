import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { TokenQuotaService } from '../token-quota.service';

@Injectable()
export class TokenQuotaGuard implements CanActivate {
  constructor(private readonly quotaService: TokenQuotaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { id: string };
    await this.quotaService.checkQuota(user.id);
    return true;
  }
}
