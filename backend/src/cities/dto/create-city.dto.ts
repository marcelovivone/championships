import { IsString, IsNotEmpty, IsInt } from 'class-validator';

/**
 * Data Transfer Object for creating a new city.
 * All fields are mandatory as per project specifications.
 */
export class CreateCityDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @IsNotEmpty()
  countryId: number;
}