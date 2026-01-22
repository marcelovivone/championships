import { UsersService } from './users.service';
import { CreateUserDto } from '../common/dtos';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
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
}
