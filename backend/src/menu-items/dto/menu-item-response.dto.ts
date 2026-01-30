import { ApiProperty } from '@nestjs/swagger';

export class MenuItemResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'statistics' })
  code: string;

  @ApiProperty({ example: 'Statistics' })
  name: string;

  @ApiProperty({ example: 'View statistics and analytics' })
  description: string | null;

  @ApiProperty({ example: 'final_user' })
  category: string;

  @ApiProperty({ example: null })
  parentId: number | null;

  @ApiProperty({ example: 6 })
  order: number;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2026-01-23T00:00:00.000Z' })
  createdAt: Date;
}
