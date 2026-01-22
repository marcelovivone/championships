/**
 * Sport DTOs (Data Transfer Objects)
 * Used for API requests and responses
 */

import { IsString, IsInt, IsBoolean, IsOptional, IsEnum, IsUrl } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Create Sport DTO
 * Used when creating a new sport
 */
export class CreateSportDto {
  @ApiProperty({ example: 'Football', description: 'The name of the sport' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'FB', description: 'Short abbreviation for the sport' })
  @IsString()
  reducedName: string;

  @ApiProperty({ example: 'collective', description: 'Type: collective or individual' })
  @IsString()
  type: string;

  @ApiProperty({ example: 'period', description: 'Division type: period, quarter, set, or time' })
  @IsString()
  divisionType: string;

  @ApiProperty({ example: 2, description: 'Number of divisions (e.g. 2 halves, 4 quarters)' })
  @IsInt()
  divisionsNumber: number;

  @ApiProperty({ example: 45, description: 'Time per division in minutes' })
  @IsInt()
  divisionTime: number; // In minutes

  @ApiProperty({ example: 'goals', description: 'Scoring system: goals or points' })
  @IsString()
  scoreType: string;

  @ApiProperty({ example: true, description: 'Does the sport allow overtime?' })
  @IsBoolean()
  hasOvertime: boolean;

  @ApiProperty({ example: true, description: 'Does the sport have penalties/shootouts?' })
  @IsBoolean()
  hasPenalties: boolean;

  @ApiProperty({ example: 'https://example.com/football.png', description: 'URL to sport icon' })
  @IsUrl()
  imageUrl: string;
}

/**
 * Update Sport DTO
 * All fields are optional for partial updates
 */
export class UpdateSportDto extends PartialType(CreateSportDto) {}

/**
 * Sport Response DTO
 * Returned in API responses
 */
export class SportResponseDto extends CreateSportDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  id: number;

  @ApiProperty()
  @IsOptional()
  createdAt?: Date;
}
