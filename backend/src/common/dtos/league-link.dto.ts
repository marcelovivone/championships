/**
 * League Link DTOs
 */

import { IsInt, IsOptional, IsString, IsUrl } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateLeagueLinkDto {
  @IsInt()
  leagueId: number;

  @IsString()
  label: string;

  @IsUrl()
  url: string;
}

export class UpdateLeagueLinkDto extends PartialType(CreateLeagueLinkDto) {}

export class LeagueLinkResponseDto extends CreateLeagueLinkDto {
  @IsInt()
  id: number;

  @IsOptional()
  createdAt?: Date;
}
