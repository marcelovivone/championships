import { IsString, IsNotEmpty, IsInt, IsOptional } from 'class-validator';

export class CreateClubDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @IsOptional()
  foundationYear?: number;

  @IsInt()
  @IsNotEmpty()
  cityId: number;

  @IsInt()
  @IsNotEmpty()
  countryId: number;

  @IsString()
  @IsOptional()
  shieldUrl?: string;
}