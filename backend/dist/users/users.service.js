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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_orm_1 = require("drizzle-orm");
const bcrypt = require("bcrypt");
const schema_1 = require("../db/schema");
let UsersService = class UsersService {
    constructor(db) {
        this.db = db;
    }
    async create(createUserDto) {
        const existing = await this.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, createUserDto.email)).limit(1);
        if (existing.length > 0) {
            throw new common_1.BadRequestException('User already exists');
        }
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(createUserDto.password, salt);
        const result = await this.db.insert(schema_1.users).values({
            ...createUserDto,
            password: hashedPassword,
        }).returning();
        const { password, ...user } = result[0];
        return user;
    }
    async findAll() {
        const allUsers = await this.db.select().from(schema_1.users);
        return allUsers.map(({ password, ...user }) => user);
    }
    async findOne(id) {
        const user = await this.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, id)).limit(1);
        if (!user.length)
            throw new common_1.NotFoundException('User not found');
        const { password, ...result } = user[0];
        return result;
    }
    async findByEmail(email) {
        const user = await this.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, email)).limit(1);
        if (!user.length)
            return null;
        return user[0];
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DRIZZLE')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], UsersService);
//# sourceMappingURL=users.service.js.map