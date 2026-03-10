import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class AdminOnlyGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
