import { IsInt, IsOptional, IsString, Min, Matches, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStandingZoneDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Type(() => Number)
  sportId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Type(() => Number)
  leagueId: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  seasonId?: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Type(() => Number)
  @Min(1)
  startPosition: number;

  @ApiProperty({ example: 4 })
  @IsInt()
  @Type(() => Number)
  @Min(1)
  endPosition: number;

  @ApiProperty({ example: 'Champions' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Combined', enum: ['All', 'Combined', 'Group'], required: false })
  @IsOptional()
  @IsString()
  typeOfStanding?: 'All' | 'Combined' | 'Group' = 'Combined';

  @ApiProperty({ example: '#FFFFFF', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^#([0-9A-Fa-f]{6})$/, { message: 'colorHex must be a valid hex color like #RRGGBB' })
  colorHex?: string = '#FFFFFF';

  @ApiProperty({ example: 2024, required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  start_year?: number | null;

  @ApiProperty({ example: 2025, required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  end_year?: number | null;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  flg_priority?: boolean;
}

export class UpdateStandingZoneDto extends CreateStandingZoneDto {}

export class StandingZoneResponseDto extends CreateStandingZoneDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ required: false })
  createdAt?: Date;

  @ApiProperty({ required: false })
  updatedAt?: Date;
}
