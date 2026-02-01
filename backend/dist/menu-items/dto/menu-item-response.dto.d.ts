export declare class MenuItemResponseDto {
    id: number;
    code: string;
    name: string;
    description: string | null;
    category: string;
    parentId: number | null;
    order: number;
    isActive: boolean;
    createdAt: Date;
}
