/**
 * Match Division DTOs
 * Used for tracking partial scores (periods, quarters, sets, etc.)
 */

import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMatchDivisionDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  matchId: number;

  @ApiProperty({ example: 1, description: 'Division number (1, 2, 3...)' })
  @Type(() => Number)
  @IsInt()
  divisionNumber: number;

  @ApiProperty({ example: 'regular', description: 'Type: regular, overtime, or penalties' })
  @IsString()
  divisionType: string;

  @ApiProperty({ example: 1, description: 'Home score in this division' })
  @Type(() => Number)
  @IsInt()
  homeScore: number;

  @ApiProperty({ example: 0, description: 'Away score in this division' })
  @Type(() => Number)
  @IsInt()
  awayScore: number;
}

export class UpdateMatchDivisionDto extends PartialType(CreateMatchDivisionDto) {}

export class MatchDivisionResponseDto extends CreateMatchDivisionDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  id: number;

  @ApiProperty()
  @IsOptional()
  createdAt?: Date;
}
