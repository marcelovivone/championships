/**
 * Round DTOs
 */

import { IsInt, IsOptional, IsDateString, IsBoolean } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoundDto {
  @ApiProperty({ example: 1, description: 'ID of the season' })
  @IsInt()
  seasonId: number;

  @ApiProperty({ example: 1, description: 'ID of the league' })
  @IsInt()
  leagueId: number;

  @ApiProperty({ example: 1, description: 'Round number' })
  @IsInt()
  roundNumber: number;

  @ApiProperty({ example: '2026-01-20T00:00:00Z', description: 'Start date', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ example: '2026-01-27T00:00:00Z', description: 'End date', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ example: false, description: 'Is this the current round?', required: false })
  @IsOptional()
  @IsBoolean()
  flgCurrent?: boolean;
}

export class UpdateRoundDto extends PartialType(CreateRoundDto) {}

export class RoundResponseDto extends CreateRoundDto {
  @IsInt()
  id: number;

  @IsOptional()
  createdAt?: Date;
}
