"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcrypt");
const users_service_1 = require("../users/users.service");
const permissions_service_1 = require("../permissions/permissions.service");
const round_auto_update_service_1 = require("../rounds/round-auto-update.service");
let AuthService = class AuthService {
    constructor(usersService, jwtService, permissionsService, roundAutoUpdateService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.permissionsService = permissionsService;
        this.roundAutoUpdateService = roundAutoUpdateService;
    }
    async validateUser(email, pass) {
        const user = await this.usersService.findByEmail(email);
        if (user && (await bcrypt.compare(pass, user.password))) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }
    async login(loginDto) {
        const user = await this.validateUser(loginDto.email, loginDto.password);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (user.profile === 'admin') {
            this.roundAutoUpdateService.autoUpdateCurrentRounds().catch(error => {
            });
        }
        const allowedMenuItems = await this.permissionsService.getUserAllowedMenuItems(user.id);
        const payload = { email: user.email, sub: user.id, profile: user.profile };
        return {
            accessToken: this.jwtService.sign(payload),
            user: user,
            allowedMenuItems,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        permissions_service_1.PermissionsService,
        round_auto_update_service_1.RoundAutoUpdateService])
], AuthService);
//# sourceMappingURL=auth.service.js.map