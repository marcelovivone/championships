/**
 * Stadium DTOs
 */

import { IsString, IsInt, IsOptional, IsEnum, IsUrl } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStadiumDto {
  @ApiProperty({ example: 'Camp Nou', description: 'Name of the stadium' })
  @IsString()
  name: string;

  @ApiProperty({ example: 1, description: 'ID of the city' })
  @IsInt()
  cityId: number;

  @ApiProperty({ example: 99354, description: 'Capacity of the stadium', required: false })
  @IsOptional()
  @IsInt()
  capacity?: number;

  @ApiProperty({ example: 1957, description: 'Year constructed', required: false })
  @IsOptional()
  @IsInt()
  yearConstructed?: number;

  @ApiProperty({ example: 'stadium', description: 'Type: stadium or gymnasium' })
  @IsString()
  type: string;

  @ApiProperty({ example: 'https://example.com/stadium.png', required: false })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;
}

export class UpdateStadiumDto extends PartialType(CreateStadiumDto) {}

export class StadiumResponseDto extends CreateStadiumDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  id: number;

  @ApiProperty()
  @IsOptional()
  createdAt?: Date;
}
