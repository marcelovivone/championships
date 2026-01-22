/**
 * Club DTOs
 */

import { IsString, IsInt, IsOptional, IsUrl } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';

export class CreateClubDto {
  @ApiProperty({ example: 'Real Madrid', description: 'Name of the club' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'RMA', description: 'Short name or abbreviation', required: false })
  @IsOptional()
  @IsString()
  shortName?: string;

  @ApiProperty({ example: 1902, description: 'Year the club was founded' })
  @IsInt()
  foundationYear: number;

  @ApiProperty({ example: 1, description: 'ID of the country the club belongs to' })
  @IsInt()
  countryId: number;

  @ApiProperty({ example: 'https://example.com/logo.png', description: 'URL to club logo', required: false })
  @IsOptional()
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
