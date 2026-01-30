/**
 * Group DTOs
 */

import { IsInt, IsOptional, IsString } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGroupDto {
  @ApiProperty({ example: 1, description: 'Season ID' })
  @IsInt()
  seasonId: number;

  @ApiProperty({ example: 'Group A', description: 'Name of the group' })
  @IsString()
  name: string;
}

export class UpdateGroupDto extends PartialType(CreateGroupDto) {}

export class GroupResponseDto extends CreateGroupDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  id: number;

  @ApiProperty()
  @IsOptional()
  createdAt?: Date;
}
