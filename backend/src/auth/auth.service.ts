import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { PermissionsService } from '../permissions/permissions.service';
import { RoundAutoUpdateService } from '../rounds/round-auto-update.service';
import { LoginDto } from '../common/dtos';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private permissionsService: PermissionsService,
    private roundAutoUpdateService: RoundAutoUpdateService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Trigger automatic round update for admin users (non-blocking)
    if (user.profile === 'admin') {
      // Run async without waiting for completion (fire and forget)
      this.roundAutoUpdateService.autoUpdateCurrentRounds().catch(error => {
        // Errors are logged internally by the service
      });
    }

    // Get user's allowed menu items
    const allowedMenuItems = await this.permissionsService.getUserAllowedMenuItems(user.id);

    const payload = { email: user.email, sub: user.id, profile: user.profile };
    return {
      accessToken: this.jwtService.sign(payload),
      user: user,
      allowedMenuItems, // Include permissions at top level
    };
  }
}