import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to require a specific permission for accessing a route
 * @param permission - The menu item code required to access this route
 * 
 * Example usage:
 * @RequirePermission('statistics')
 * @Get('statistics')
 * getStatistics() { ... }
 */
export const RequirePermission = (permission: string) => SetMetadata('permission', permission);
