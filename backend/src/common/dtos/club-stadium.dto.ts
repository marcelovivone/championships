/**
 * Club Stadium DTOs
 * Temporal relationship between clubs and stadiums
 */

import { IsInt, IsOptional, IsDateString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateClubStadiumDto {
  @IsInt()
  clubId: number;

  @IsInt()
  stadiumId: number;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class UpdateClubStadiumDto extends PartialType(CreateClubStadiumDto) {}

export class ClubStadiumResponseDto extends CreateClubStadiumDto {
  @IsInt()
  id: number;

  @IsOptional()
  createdAt?: Date;
}
