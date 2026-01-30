/**
 * Season DTOs
 */

import { IsInt, IsOptional, IsEnum, IsBoolean, Min, Max } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateSeasonDto {
  @ApiProperty({ example: 1, description: 'Sport ID' })
  @IsInt()
  sportId: number;

  @ApiProperty({ example: 1, description: 'League ID' })
  @IsInt()
  leagueId: number;

  @ApiProperty({ example: 2025, description: 'Start year of the season' })
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  startYear: number;

  @ApiProperty({ example: 2026, description: 'End year of the season' })
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  endYear: number;

  @ApiProperty({ example: 'planned', description: 'Season status', enum: ['planned', 'active', 'finished'] })
  @IsEnum(['planned', 'active', 'finished'])
  status: 'planned' | 'active' | 'finished' = 'planned';

  @ApiProperty({ example: false, description: 'Is this the default season for the league?', required: false })
  @IsOptional()
  @IsBoolean()
  flgDefault?: boolean;

  @ApiProperty({ example: 4, description: 'Number of groups in the season (0 or greater)', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  numberOfGroups?: number;
}

export class UpdateSeasonDto extends PartialType(CreateSeasonDto) {}

export class SeasonResponseDto extends CreateSeasonDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  id: number;

  @ApiProperty()
  @IsOptional()
  createdAt?: Date;
}
