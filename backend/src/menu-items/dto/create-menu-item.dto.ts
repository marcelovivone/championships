import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean } from 'class-validator';

export class CreateMenuItemDto {
  @ApiProperty({ example: 'statistics', description: 'Unique code for the menu item' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Statistics', description: 'Display name of the menu item' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'View statistics and analytics', description: 'Description of the menu item', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'final_user', description: 'Category: admin, final_user, or both' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: null, description: 'Parent menu item ID for nested menus', required: false })
  @IsInt()
  @IsOptional()
  parentId?: number;

  @ApiProperty({ example: 6, description: 'Display order', required: false })
  @IsInt()
  @IsOptional()
  order?: number;

  @ApiProperty({ example: true, description: 'Whether the menu item is active', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
