import { AuthService } from './auth.service';
import { LoginDto } from '../common/dtos';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto): Promise<{
        accessToken: string;
        user: any;
        allowedMenuItems: string[];
    }>;
}
