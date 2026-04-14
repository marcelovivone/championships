import { IsInt, IsOptional, IsString, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateStandingOrderRuleDto {
  @ApiProperty({ example: 3, description: 'Sport ID' })
  @IsInt()
  @Type(() => Number)
  sportId: number;

  @ApiProperty({ example: 1, description: 'League ID (null = sport-level default)', required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  leagueId?: number | null;

  @ApiProperty({ example: 2000, description: 'Start year (null = all years)', required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  startYear?: number | null;

  @ApiProperty({ example: null, description: 'End year (null = still in effect)', required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  endYear?: number | null;

  @ApiProperty({ example: 100, description: 'Sort order (gapped: 100, 200, 300...)' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  sortOrder: number;

  @ApiProperty({ example: 'POINTS', description: 'Criterion identifier' })
  @IsString()
  criterion: string;

  @ApiProperty({ example: 'DESC', description: 'Sort direction', enum: ['ASC', 'DESC'] })
  @IsString()
  @IsIn(['ASC', 'DESC'])
  direction: string = 'DESC';
}

export class UpdateStandingOrderRuleDto extends PartialType(CreateStandingOrderRuleDto) {}

export class StandingOrderRuleResponseDto extends CreateStandingOrderRuleDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ required: false })
  createdAt?: Date;
}
