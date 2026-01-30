import { IsString, IsNotEmpty, MinLength, IsOptional } from 'class-validator';

export class CreateCountryDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  code: string; // e.g., "BRA", "USA", "CAN"

  @IsString()
  @IsNotEmpty()
  continent: string; // 'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'

  @IsString()
  @IsOptional()
  flagUrl?: string;
}