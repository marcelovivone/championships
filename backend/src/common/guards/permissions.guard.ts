import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from '../../permissions/permissions.service';

/**
 * Guard to check if user has permission to access a specific menu item/feature
 * Usage: @UseGuards(JwtAuthGuard, PermissionsGuard)
 *        @RequirePermission('statistics')
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get the required permission from the route metadata
    const requiredPermission = this.reflector.get<string>('permission', context.getHandler());
    
    // If no permission is required, allow access
    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If no user is authenticated, deny access
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Admin always has full access
    if (user.profile === 'admin') {
      return true;
    }

    // Check if user has permission
    const allowedMenuItems = await this.permissionsService.getUserAllowedMenuItems(user.id);
    
    if (!allowedMenuItems.includes(requiredPermission)) {
      throw new ForbiddenException(`You do not have permission to access: ${requiredPermission}`);
    }

    return true;
  }
}
