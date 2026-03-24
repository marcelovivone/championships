import { UserProfile } from '../common/dtos/user.dto';
export declare const ROLES_KEY = "roles";
export declare const Roles: (...roles: UserProfile[]) => import("@nestjs/common").CustomDecorator<string>;
