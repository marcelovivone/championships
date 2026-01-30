import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, IsBoolean, IsOptional } from 'class-validator';

export class CreateProfilePermissionDto {
  @ApiProperty({ example: 'final_user', description: 'User profile' })
  @IsString()
  @IsNotEmpty()
  profile: string;

  @ApiProperty({ example: 1, description: 'Menu item ID' })
  @IsInt()
  @IsNotEmpty()
  menuItemId: number;

  @ApiProperty({ example: true, description: 'Whether the profile can access this menu item' })
  @IsBoolean()
  @IsOptional()
  canAccess?: boolean;
}

export class CreateUserPermissionDto {
  @ApiProperty({ example: 1, description: 'User ID' })
  @IsInt()
  @IsNotEmpty()
  userId: number;

  @ApiProperty({ example: 1, description: 'Menu item ID' })
  @IsInt()
  @IsNotEmpty()
  menuItemId: number;

  @ApiProperty({ example: true, description: 'Whether the user can access this menu item' })
  @IsBoolean()
  @IsOptional()
  canAccess?: boolean;
}
