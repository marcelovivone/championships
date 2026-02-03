/**
 * Match DTOs
 */

import { IsString, IsInt, IsOptional, IsBoolean, IsDateString, IsEnum } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MatchStatus } from '../enums/match-status.enum';

export class CreateMatchDto {
  @ApiProperty({ example: 1, description: 'Sport ID' })
  @IsInt()
  sportId: number;

  @ApiProperty({ example: 1, description: 'League ID' })
  @IsInt()
  leagueId: number;

  @ApiProperty({ example: 1, description: 'Season ID' })
  @IsInt()
  seasonId: number;

  @ApiProperty({ example: 1, description: 'Round ID (optional - only for Round-based leagues)', required: false })
  @IsOptional()
  @IsInt()
  roundId?: number;

  @ApiProperty({ example: 1, description: 'Group ID (optional)', required: false })
  @IsOptional()
  @IsInt()
  groupId?: number;

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

  @ApiProperty({
  enum: MatchStatus,
  example: MatchStatus.SCHEDULED,
  })
  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;

  @ApiProperty()
  @IsOptional()
  createdAt?: Date;

  @ApiProperty()
  @IsOptional()
  updatedAt?: Date;
}

export class UpdateMatchDto {
  @IsOptional()
  @IsInt()
  sportId?: number;

  @IsOptional()
  @IsInt()
  leagueId?: number;

  @IsOptional()
  @IsInt()
  seasonId?: number;

  @IsOptional()
  @IsInt()
  roundId?: number;

  @IsOptional()
  @IsInt()
  groupId?: number;

  @IsOptional()
  @IsInt()
  homeClubId?: number;

  @IsOptional()
  @IsInt()
  awayClubId?: number;

  @IsOptional()
  @IsInt()
  stadiumId?: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsInt()
  homeScore?: number;

  @IsOptional()
  @IsInt()
  awayScore?: number;

  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;
}

export class MatchResponseDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  id: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  sportId: number;

  @ApiProperty({ example: 1 })
  leagueId: number;

  @ApiProperty({ example: 1 })
  seasonId: number;

  @ApiProperty({ example: 1 })
  roundId: number;

  @ApiProperty({ example: 1, required: false })
  groupId?: number;

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

  @ApiProperty({
  enum: MatchStatus,
  example: MatchStatus.SCHEDULED,
  })
  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;

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
}
