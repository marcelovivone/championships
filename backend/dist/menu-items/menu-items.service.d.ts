import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
export declare class MenuItemsService {
    private db;
    constructor(db: NodePgDatabase<typeof schema>);
    create(createMenuItemDto: CreateMenuItemDto): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        code: string;
        description: string;
        isActive: boolean;
        category: string;
        parentId: number;
        order: number;
    }>;
    findAll(): Promise<{
        id: number;
        code: string;
        name: string;
        description: string;
        category: string;
        parentId: number;
        order: number;
        isActive: boolean;
        createdAt: Date;
    }[]>;
    findByCategory(category: string): Promise<{
        id: number;
        code: string;
        name: string;
        description: string;
        category: string;
        parentId: number;
        order: number;
        isActive: boolean;
        createdAt: Date;
    }[]>;
    findOne(id: number): Promise<{
        id: number;
        code: string;
        name: string;
        description: string;
        category: string;
        parentId: number;
        order: number;
        isActive: boolean;
        createdAt: Date;
    }>;
    update(id: number, updateMenuItemDto: UpdateMenuItemDto): Promise<{
        id: number;
        code: string;
        name: string;
        description: string;
        category: string;
        parentId: number;
        order: number;
        isActive: boolean;
        createdAt: Date;
    }>;
    remove(id: number): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        code: string;
        description: string;
        isActive: boolean;
        category: string;
        parentId: number;
        order: number;
    }>;
}
