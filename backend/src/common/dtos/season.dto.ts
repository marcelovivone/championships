/**
 * Season DTOs
 */

import { IsInt, IsOptional, IsEnum } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';

export class CreateSeasonDto {
  @IsInt()
  leagueId: number;

  @Type(() => Number)
  @IsInt()
  year: number; // Season year identifier

  @IsEnum(['planned', 'ongoing', 'finished'])
  status: 'planned' | 'ongoing' | 'finished' = 'planned';
}

export class UpdateSeasonDto extends PartialType(CreateSeasonDto) {}

export class SeasonResponseDto extends CreateSeasonDto {
  @IsInt()
  id: number;

  @IsOptional()
  createdAt?: Date;
}
