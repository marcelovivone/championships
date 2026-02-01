import { UsersService } from './users.service';
import { CreateUserDto } from '../common/dtos';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(): Promise<{
        id: number;
        email: string;
        name: string;
        profile: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    create(createUserDto: CreateUserDto): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        profile: string;
        isActive: boolean;
    }>;
    findOne(id: number): Promise<{
        id: number;
        email: string;
        name: string;
        profile: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
