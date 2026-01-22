/**
 * Phase DTOs
 */

import { IsInt, IsOptional, IsString, IsEnum } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePhaseDto {
  @ApiProperty({ example: 1, description: 'Season ID' })
  @IsInt()
  seasonId: number;

  @ApiProperty({ example: 'Regular Season', description: 'Name of the phase' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'league', description: 'Type: league, knockout, or groups' })
  @IsString()
  type: string;

  @ApiProperty({ example: 1, description: 'Order of the phase' })
  @Type(() => Number)
  @IsInt()
  order: number;
}

export class UpdatePhaseDto extends PartialType(CreatePhaseDto) {}

export class PhaseResponseDto extends CreatePhaseDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  id: number;

  @ApiProperty()
  @IsOptional()
  createdAt?: Date;
}
