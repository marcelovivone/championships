import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class CreateCountryDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  code: string; // e.g., "BR", "USA", "CAN"
}