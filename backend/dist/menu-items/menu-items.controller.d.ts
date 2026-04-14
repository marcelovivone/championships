import { MenuItemsService } from './menu-items.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
export declare class MenuItemsController {
    private readonly menuItemsService;
    constructor(menuItemsService: MenuItemsService);
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
    findAll(category?: string): Promise<{
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
    findOne(id: string): Promise<{
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
    update(id: string, updateMenuItemDto: UpdateMenuItemDto): Promise<{
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
    remove(id: string): Promise<{
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
