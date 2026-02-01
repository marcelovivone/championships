import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PermissionsService } from '../permissions/permissions.service';
import { RoundAutoUpdateService } from '../rounds/round-auto-update.service';
import { LoginDto } from '../common/dtos';
export declare class AuthService {
    private usersService;
    private jwtService;
    private permissionsService;
    private roundAutoUpdateService;
    constructor(usersService: UsersService, jwtService: JwtService, permissionsService: PermissionsService, roundAutoUpdateService: RoundAutoUpdateService);
    validateUser(email: string, pass: string): Promise<any>;
    login(loginDto: LoginDto): Promise<{
        accessToken: string;
        user: any;
        allowedMenuItems: string[];
    }>;
}
