import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { CreateUserDto } from '../common/dtos';
export declare class UsersService {
    private db;
    constructor(db: NodePgDatabase<typeof schema>);
    create(createUserDto: CreateUserDto): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        role: string;
    }>;
    findOne(id: number): Promise<{
        id: number;
        email: string;
        name: string;
        role: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findByEmail(email: string): Promise<{
        id: number;
        email: string;
        password: string;
        name: string;
        role: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
