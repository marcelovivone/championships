import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSeasonClubDto {
  @ApiProperty({ description: 'The ID of the sport', example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  sportId: number;

  @ApiProperty({ description: 'The ID of the league', example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  leagueId: number;

  @ApiProperty({ description: 'The ID of the season', example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  seasonId: number;

  @ApiProperty({ description: 'The ID of the club', example: 5 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  clubId: number;

  @ApiProperty({ description: 'The ID of the group (optional)', example: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  groupId?: number;
}
