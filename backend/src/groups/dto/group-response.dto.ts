import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional, IsDateString } from 'class-validator';

export class GroupResponseDto {
  @ApiProperty({ example: 1, description: 'The unique identifier of the group' })
  @IsInt()
  id: number;

  @ApiProperty({ example: 'Group A', description: 'Name of the group' })
  @IsString()
  name: string;

  @ApiProperty({ example: 1, description: 'Season ID' })
  @IsInt()
  seasonId: number;

  @ApiProperty({ example: 1, description: 'Sport ID' })
  @IsInt()
  sportId: number;

  @ApiProperty({ example: 1, description: 'League ID' })
  @IsInt()
  leagueId: number;

  @ApiProperty({ example: '2025-08-01T00:00:00Z', description: 'Creation timestamp' })
  @IsDateString()
  createdAt: Date;
}
