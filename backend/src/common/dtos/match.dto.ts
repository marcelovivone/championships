/**
 * Match DTOs
 */

import { IsString, IsInt, IsOptional, IsBoolean, IsDateString, IsEnum } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateMatchDto {
  @ApiProperty({ example: 1, description: 'League ID' })
  @IsInt()
  leagueId: number;

  @ApiProperty({ example: 1, description: 'Season ID' })
  @IsInt()
  seasonId: number;

  @ApiProperty({ example: 1, description: 'Phase ID' })
  @IsInt()
  phaseId: number;

  @ApiProperty({ example: 1, description: 'Round ID' })
  @IsInt()
  roundId: number;

  @ApiProperty({ example: 1, description: 'Group ID (optional)', required: false })
  @IsOptional()
  @IsInt()
  groupId?: number;

  @ApiProperty({ example: 1, description: 'League Division ID (optional)', required: false })
  @IsOptional()
  @IsInt()
  leagueDivisionId?: number;

  @ApiProperty({ example: 1, description: 'Turn number (1 or 2)' })
  @Type(() => Number)
  @IsInt()
  turn: number = 1;

  @ApiProperty({ example: 10, description: 'Home Club ID' })
  @IsInt()
  homeClubId: number;

  @ApiProperty({ example: 12, description: 'Away Club ID' })
  @IsInt()
  awayClubId: number;

  @ApiProperty({ example: 5, description: 'Stadium ID (optional)', required: false })
  @IsOptional()
  @IsInt()
  stadiumId?: number;

  @ApiProperty({ example: '2024-05-20T15:00:00Z', description: 'Match date and time' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 2, description: 'Home score (optional)', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  homeScore?: number;

  @ApiProperty({ example: 1, description: 'Away score (optional)', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  awayScore?: number;

  @ApiProperty({ example: false, description: 'Did match go to overtime?', required: false })
  @IsOptional()
  @IsBoolean()
  hasOvertime?: boolean;

  @ApiProperty({ example: false, description: 'Did match go to penalties?', required: false })
  @IsOptional()
  @IsBoolean()
  hasPenalties?: boolean;
}

export class UpdateMatchDto extends PartialType(CreateMatchDto) {}

export class MatchResponseDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  id: number;

  @ApiProperty({ example: 1 })
  leagueId: number;

  @ApiProperty({ example: 1 })
  seasonId: number;

  @ApiProperty({ example: 1 })
  phaseId: number;

  @ApiProperty({ example: 1 })
  roundId: number;

  @ApiProperty({ example: 1, required: false })
  groupId?: number;

  @ApiProperty({ example: 1, required: false })
  leagueDivisionId?: number;

  @ApiProperty({ example: 1 })
  turn: number;

  @ApiProperty({ example: 10 })
  homeClubId: number;

  @ApiProperty({ example: 12 })
  awayClubId: number;

  @ApiProperty({ example: 5, required: false })
  stadiumId?: number;

  @ApiProperty({ example: '2024-05-20T15:00:00Z' })
  date: Date;

  @ApiProperty({ example: 2, required: false })
  homeScore?: number;

  @ApiProperty({ example: 1, required: false })
  awayScore?: number;

  @ApiProperty({ example: false, required: false })
  hasOvertime?: boolean;

  @ApiProperty({ example: false, required: false })
  hasPenalties?: boolean;

  @ApiProperty({ enum: ['scheduled', 'live', 'finished', 'postponed', 'cancelled'], example: 'scheduled' })
  status: string;

  @ApiProperty()
  @IsOptional()
  createdAt?: Date;

  @ApiProperty()
  @IsOptional()
  updatedAt?: Date;
}

/**
 * Match Score Update DTO
 * Used when updating match final scores
 */
export class UpdateMatchScoreDto {
  @ApiProperty({ example: 2, description: 'Final home score' })
  @Type(() => Number)
  @IsInt()
  homeScore: number;

  @ApiProperty({ example: 1, description: 'Final away score' })
  @Type(() => Number)
  @IsInt()
  awayScore: number;

  @ApiProperty({ example: false, description: 'Overtime flag', required: false })
  @IsOptional()
  @IsBoolean()
  hasOvertime?: boolean;

  @ApiProperty({ example: false, description: 'Penalties flag', required: false })
  @IsOptional()
  @IsBoolean()
  hasPenalties?: boolean;
}
