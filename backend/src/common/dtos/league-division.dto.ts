/**
 * League Division DTOs
 */

import { IsInt, IsOptional, IsString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateLeagueDivisionDto {
  @IsInt()
  leagueId: number;

  @IsString()
  name: string;
}

export class UpdateLeagueDivisionDto extends PartialType(CreateLeagueDivisionDto) {}

export class LeagueDivisionResponseDto extends CreateLeagueDivisionDto {
  @IsInt()
  id: number;

  @IsOptional()
  createdAt?: Date;
}
