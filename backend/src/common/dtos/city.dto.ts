/**
 * City DTOs
 */

import { IsString, IsInt, IsOptional } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCityDto {
  @ApiProperty({ example: 'Barcelona', description: 'Name of the city' })
  @IsString()
  name: string;

  @ApiProperty({ example: 1, description: 'ID of the country' })
  @IsInt()
  countryId: number;
}

export class UpdateCityDto extends PartialType(CreateCityDto) {}

export class CityResponseDto extends CreateCityDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  id: number;

  @ApiProperty()
  @IsOptional()
  createdAt?: Date;
}
