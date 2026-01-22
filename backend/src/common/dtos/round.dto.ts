/**
 * Round DTOs
 */

import { IsInt, IsOptional, IsDateString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateRoundDto {
  @IsInt()
  leagueId: number;

  @IsInt()
  phaseId: number;

  @IsInt()
  roundNumber: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class UpdateRoundDto extends PartialType(CreateRoundDto) {}

export class RoundResponseDto extends CreateRoundDto {
  @IsInt()
  id: number;

  @IsOptional()
  createdAt?: Date;
}
