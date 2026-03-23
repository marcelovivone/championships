import { SetMetadata } from '@nestjs/common';
import { UserProfile } from '../common/dtos/user.dto';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserProfile[]) => SetMetadata(ROLES_KEY, roles);