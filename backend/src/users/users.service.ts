import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import * as schema from '../db/schema';
import { users } from '../db/schema';
import { CreateUserDto, UpdateUserDto } from '../common/dtos';

@Injectable()
export class UsersService {
  constructor(
    @Inject('DRIZZLE')
    private db: NodePgDatabase<typeof schema>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    // Check if user exists
    const existing = await this.db.select().from(users).where(eq(users.email, createUserDto.email)).limit(1);
    if (existing.length > 0) {
      throw new BadRequestException('User already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    // Create user
    const result = await this.db.insert(users).values({
      ...createUserDto,
      password: hashedPassword,
    }).returning();

    // Return without password
    const { password, ...user } = result[0];
    return user;
  }

  async findOne(id: number) {
    const user = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user.length) throw new NotFoundException('User not found');
    const { password, ...result } = user[0];
    return result;
  }

  async findByEmail(email: string) {
    const user = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user.length) return null;
    return user[0];
  }
}