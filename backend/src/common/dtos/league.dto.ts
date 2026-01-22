/**
 * League DTOs
 * Comprehensive DTO for complex league configuration
 */

import { IsString, IsInt, IsOptional, IsBoolean, IsUrl, IsEnum } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateLeagueDto {
  @ApiProperty({ example: 'Premier League', description: 'Original name of the league' })
  @IsString()
  originalName: string;

  @ApiProperty({ example: 'EPL', description: 'Secondary name or abbreviation', required: false })
  @IsOptional()
  @IsString()
  secondaryName?: string;

  @ApiProperty({ example: 1, description: 'ID of the sport' })
  @IsInt()
  sportId: number;

  @ApiProperty({ example: 1, description: 'ID of the country (optional for international leagues)', required: false })
  @IsOptional()
  @IsInt()
  countryId?: number;

  @ApiProperty({ example: 1, description: 'ID of the city (optional)', required: false })
  @IsOptional()
  @IsInt()
  cityId?: number;

  @ApiProperty({ example: 2024, description: 'Start year of the season' })
  @IsInt()
  startYear: number;

  @ApiProperty({ example: 2025, description: 'End year of the season' })
  @IsInt()
  endYear: number;

  @ApiProperty({ example: 2, description: 'Number of turns (e.g. home and away)' })
  @IsInt()
  numberOfTurns: number;

  @ApiProperty({ example: 38, description: 'Total number of rounds' })
  @IsInt()
  numberOfRounds: number;

  @ApiProperty({ example: 2, description: 'Minimum number of match divisions (e.g. halves)' })
  @IsInt()
  minDivisionsNumber: number;

  @ApiProperty({ example: 2, description: 'Maximum number of match divisions' })
  @IsInt()
  maxDivisionsNumber: number;

  @ApiProperty({ example: 45, description: 'Time per division in minutes (optional override)', required: false })
  @IsOptional()
  @IsInt()
  divisionsTime?: number;

  @ApiProperty({ example: false, description: 'Override sport overtime rule', required: false })
  @IsOptional()
  @IsBoolean()
  hasOvertimeOverride?: boolean;

  @ApiProperty({ example: false, description: 'Override sport penalties rule', required: false })
  @IsOptional()
  @IsBoolean()
  hasPenaltiesOverride?: boolean;

  @ApiProperty({ example: true, description: 'Does the league have promotion?' })
  @IsBoolean()
  hasAscends: boolean = false;

  @ApiProperty({ example: 3, description: 'Number of teams promoted', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ascendsQuantity?: number;

  @ApiProperty({ example: true, description: 'Does the league have relegation?' })
  @IsBoolean()
  hasDescends: boolean = false;

  @ApiProperty({ example: 3, description: 'Number of teams relegated', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  descendsQuantity?: number;

  @ApiProperty({ example: false, description: 'Does the league have sub-leagues/conferences?' })
  @IsBoolean()
  hasSubLeagues: boolean = false;

  @ApiProperty({ example: 2, description: 'Number of sub-leagues', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  numberOfSubLeagues?: number;

  @ApiProperty({ example: 'https://example.com/league-logo.png', required: false })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;
}

export class UpdateLeagueDto extends PartialType(CreateLeagueDto) {}

export class LeagueResponseDto extends CreateLeagueDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  id: number;

  @ApiProperty()
  @IsOptional()
  createdAt?: Date;
}
