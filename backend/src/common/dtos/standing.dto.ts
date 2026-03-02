/**
 * Standing DTOs
 * Used for league standings/classification
 */

import { IsInt, IsOptional, IsString } from 'class-validator';
import { CreateMatchDivisionDto } from './match-division.dto';
import { PartialType } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateStandingDto {
    @ApiProperty({ example: 1 })
    @IsInt()
    sportId: number;

    @ApiProperty({ example: 1 })
    @IsInt()
    leagueId: number;

    @ApiProperty({ example: 1 })
    @IsInt()
    seasonId: number;

    @ApiProperty({ example: 1 })
    @IsOptional()
    @IsInt()
    roundId: number;

    @ApiProperty({ example: '2023-01-01', type: String })
    @IsOptional()
    @IsString()
    matchDate: string;

    @ApiProperty({ example: 1, required: false })
    @IsOptional()
    @IsInt()
    groupId?: number;

    @ApiProperty({ example: 123, required: true })
    @IsInt()
    matchId: number;

    @ApiProperty({ example: 1 })
    @IsInt()
    homeClubId: number;

    @ApiProperty({ example: 2 })
    @IsInt()
    awayClubId: number;

    @ApiProperty({ example: 2, required: false })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    homeScore?: number;

    @ApiProperty({ example: 1, required: false })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    awayScore?: number;

    @ApiProperty({ example: 3 })
    @Type(() => Number)
    @IsInt()
    @Type(() => Number)
    played: number = 0;

    @ApiProperty({ example: 1 })
    @Type(() => Number)
    @IsInt()
    wins: number = 0;

    @ApiProperty({ example: 0 })
    @Type(() => Number)
    @IsInt()
    draws: number = 0;

    @ApiProperty({ example: 0 })
    @Type(() => Number)
    @IsInt()
    losses: number = 0;

    @ApiProperty({ example: 2 })
    @Type(() => Number)
    @IsInt()
    goalsFor: number = 0;

    @ApiProperty({ example: 1 })
    @Type(() => Number)
    @IsInt()
    goalsAgainst: number = 0;

    @ApiProperty({ example: 1 })
    @Type(() => Number)
    @IsInt()
    goalDifference: number = 0;

    // Sport-specific fields
    @ApiProperty({ example: 0, required: false })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    overtimeWins?: number;

    @ApiProperty({ example: 0, required: false })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    overtimeLosses?: number;

    @ApiProperty({ example: 0, required: false })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    penaltyWins?: number;

    @ApiProperty({ example: 0, required: false })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    penaltyLosses?: number;

    @ApiProperty({ example: 0, required: false })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    setsWon?: number;

    @ApiProperty({ example: 0, required: false })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    setsLost?: number;

    @ApiProperty({ example: 0, required: false })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    divisionsWon?: number;

    @ApiProperty({ example: 0, required: false })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    divisionsLost?: number;

    // Home/Away tracking
    @ApiProperty({ example: 1 })
    @Type(() => Number)
    @IsInt()
    homeGamesPlayed: number = 0;

    @ApiProperty({ example: 0 })
    @Type(() => Number)
    @IsInt()
    awayGamesPlayed: number = 0;

    @ApiProperty({ example: 1 })
    @Type(() => Number)
    @IsInt()
    homeWins: number = 0;

    @ApiProperty({ example: 0 })
    @Type(() => Number)
    @IsInt()
    homeLosses: number = 0;

    @ApiProperty({ example: 0 })
    @Type(() => Number)
    @IsInt()
    homeDraws: number = 0;

    @ApiProperty({ example: 0 })
    @Type(() => Number)
    @IsInt()
    awayWins: number = 0;

    @ApiProperty({ example: 0 })
    @Type(() => Number)
    @IsInt()
    awayLosses: number = 0;

    @ApiProperty({ example: 0 })
    @Type(() => Number)
    @IsInt()
    awayDraws: number = 0;

    @ApiProperty({ type: () => [CreateMatchDivisionDto], required: false })
    @IsOptional()
    matchDivisions?: any[];
}

export class UpdateStandingDto extends PartialType(CreateStandingDto) { }

export class StandingResponseDto extends CreateStandingDto {
    @ApiProperty({ example: 1 })
    @IsInt()
    id: number;

    @ApiProperty()
    @IsOptional()
    createdAt?: Date;

    @ApiProperty()
    @IsOptional()
    updatedAt?: Date;
}
