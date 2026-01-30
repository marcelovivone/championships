import { ApiProperty } from '@nestjs/swagger';

export class ProfilePermissionResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'final_user' })
  profile: string;

  @ApiProperty({ example: 1 })
  menuItemId: number;

  @ApiProperty({ example: true })
  canAccess: boolean;

  @ApiProperty({ example: '2026-01-23T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-23T00:00:00.000Z' })
  updatedAt: Date;
}

export class UserPermissionResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  userId: number;

  @ApiProperty({ example: 1 })
  menuItemId: number;

  @ApiProperty({ example: true })
  canAccess: boolean;

  @ApiProperty({ example: '2026-01-23T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-23T00:00:00.000Z' })
  updatedAt: Date;
}

export class UserPermissionsDto {
  @ApiProperty({ example: 1 })
  userId: number;

  @ApiProperty({ 
    example: ['main_screen', 'leagues', 'standings'],
    description: 'List of menu item codes the user can access'
  })
  allowedMenuItems: string[];
}
