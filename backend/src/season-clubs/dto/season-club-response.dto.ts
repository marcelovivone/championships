import { ApiProperty } from '@nestjs/swagger';

export class SeasonClubResponseDto {
  @ApiProperty({ description: 'The ID of the season-club association', example: 1 })
  id: number;

  @ApiProperty({ description: 'The ID of the season', example: 1 })
  seasonId: number;

  @ApiProperty({ description: 'The ID of the club', example: 5 })
  clubId: number;

  @ApiProperty({ description: 'Date when the club joined the season', example: '2025-08-01T00:00:00Z' })
  joinDate: Date;

  @ApiProperty({
    description: 'Date when the club left the season (NULL = still active)',
    example: null,
    required: false,
  })
  leaveDate?: Date;

  @ApiProperty({ description: 'When the association was created', example: '2025-08-01T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: 'When the association was last updated', example: '2025-08-01T00:00:00Z' })
  updatedAt: Date;
}
