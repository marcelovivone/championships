import { IsInt, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class CreateClubStadiumDto {
  @IsInt()
  @IsNotEmpty()
  clubId: number;

  @IsInt()
  @IsNotEmpty()
  stadiumId: number;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
