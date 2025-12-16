import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { isAdmin } from '../permissions.util';

/**
 * AdminOnlyGuard - Only admins (including superAdmin) can access
 * Use this for destructive operations like delete, ban, etc.
 */
@Injectable()
export class AdminOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!isAdmin(user)) {
      throw new ForbiddenException('Bu işleme sadece admin izinli.');
    }

    return true;
  }
}








