/**
 * Club DTOs
 */

import { IsString, IsInt, IsOptional, IsUrl, ValidateIf, Min, Max } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';

// Helper function to get current year
const getCurrentYear = () => new Date().getFullYear();

export class CreateClubDto {
  @ApiProperty({ example: 'Real Madrid', description: 'Name of the club' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'RMA', description: 'Short name or abbreviation', required: false })
  @IsOptional()
  @IsString()
  shortName?: string;

  @ApiProperty({ example: 1902, description: 'Year the club was founded', required: false })
  @IsOptional()
  @ValidateIf((object: CreateClubDto) => 
    object.foundationYear !== undefined && 
    object.foundationYear !== null && 
    object.foundationYear !== ""
  )
  @IsInt({ message: 'Foundation year must be a valid integer' })
  @Min(1800, { message: 'Foundation year must be 1800 or later' })
  @Max(getCurrentYear(), { message: 'Foundation year cannot be in the future' })
  foundationYear?: number;

  @ApiProperty({ example: 1, description: 'ID of the city the club belongs to', required: false })
  @IsOptional()
  @IsInt()
  cityId?: number;

  @ApiProperty({ example: 1, description: 'ID of the country the club belongs to' })
  @IsInt()
  countryId: number;

  @ApiProperty({ example: 'https://example.com/logo.png', description: 'URL to club logo', required: false })
  @IsOptional()
  @ValidateIf((object: CreateClubDto) => object.imageUrl !== '' && object.imageUrl !== null && object.imageUrl !== undefined)
  @IsUrl()
  imageUrl?: string;
}

export class UpdateClubDto extends PartialType(CreateClubDto) {}

export class ClubResponseDto extends CreateClubDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  id: number;

  @ApiProperty()
  @IsOptional()
  createdAt?: Date;
}