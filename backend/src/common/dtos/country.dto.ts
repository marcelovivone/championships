/**
 * Country DTOs (Data Transfer Objects)
 */

import { IsString, IsInt, IsOptional, IsUrl, IsEnum, ValidateIf } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';

const CONTINENTS = [
  'Africa',
  'Asia',
  'Europe',
  'North America',
  'South America',
  'Oceania',
];

export class CreateCountryDto {
  @ApiProperty({ example: 'Brazil', description: 'The name of the country' })
  @IsString()
  name: string;

  @ApiProperty({ enum: CONTINENTS, example: 'South America', description: 'The continent of the country' })
  @IsEnum(CONTINENTS)
  continent: string;

  @ApiProperty({ example: 'BRA', description: 'ISO 3166-1 alpha-3 code', minLength: 3, maxLength: 3 })
  @IsString()
  code: string; // ISO 3166-1 alpha-3

  @ApiProperty({ example: 'https://flagcdn.com/br.svg', description: 'URL to the country flag image', required: false })
  @IsOptional()
  @ValidateIf((object: CreateCountryDto) => object.flagUrl !== '' && object.flagUrl !== null && object.flagUrl !== undefined)
  @IsUrl()
  flagUrl?: string;
}

export class UpdateCountryDto extends PartialType(CreateCountryDto) {}

export class CountryResponseDto extends CreateCountryDto {
  @ApiProperty({ example: 1, description: 'The unique identifier of the country' })
  @IsInt()
  id: number;

  @ApiProperty({ example: '2024-01-20T12:00:00Z', description: 'Creation timestamp', required: false })
  @IsOptional()
  createdAt?: Date;
}