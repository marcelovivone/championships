import { ApiProperty } from '@nestjs/swagger';

export class SeasonClubResponseDto {
  @ApiProperty({ description: 'The ID of the season-club association', example: 1 })
  id: number;

  @ApiProperty({ description: 'The ID of the sport', example: 1 })
  sportId: number;

  @ApiProperty({ description: 'The ID of the league', example: 1 })
  leagueId: number;

  @ApiProperty({ description: 'The ID of the season', example: 1 })
  seasonId: number;

  @ApiProperty({ description: 'The ID of the club', example: 5 })
  clubId: number;

  @ApiProperty({
    description: 'The ID of the group (optional)',
    example: 1,
    required: false,
  })
  groupId?: number;

  @ApiProperty({ description: 'When the association was created', example: '2025-08-01T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Sport information', required: false })
  sport?: {
    id: number;
    name: string;
  };

  @ApiProperty({ description: 'League information', required: false })
  league?: {
    id: number;
    originalName: string;
    secondaryName: string;
  };

  @ApiProperty({ description: 'Season information', required: false })
  season?: {
    id: number;
    startYear: number;
    endYear: number;
  };

  @ApiProperty({ description: 'Club information', required: false })
  club?: {
    id: number;
    name: string;
    imageUrl: string;
  };

  @ApiProperty({ description: 'Group information', required: false })
  group?: {
    id: number;
    name: string;
  };
}
