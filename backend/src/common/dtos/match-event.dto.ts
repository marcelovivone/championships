import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum MatchEventType {
  GOAL = 'goal',
  OWN_GOAL = 'own_goal',
  ASSIST = 'assist',
  YELLOW_CARD = 'yellow_card',
  RED_CARD = 'red_card',
  SUBSTITUTION = 'substitution',
  INJURY = 'injury',
  TIMEOUT = 'timeout',
  POINT = 'point',
  SET_WIN = 'set_win',
  FOUL = 'foul',
  PENALTY = 'penalty',
}

/**
 * DTO for creating match events
 */
export class CreateMatchEventDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsNotEmpty()
  matchId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsNotEmpty()
  clubId: number;

  @ApiProperty({ example: 'goal', description: 'Type of event' })
  @IsString()
  @IsNotEmpty()
  eventType: string;

  @ApiProperty({ example: 1, required: false })
  @IsInt()
  @IsOptional()
  playerId?: number;

  @ApiProperty({ example: 45, required: false })
  @IsInt()
  @IsOptional()
  minute?: number;

  @ApiProperty({ example: 'Goal scored', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}

/**
 * DTO for updating match events
 */
export class UpdateMatchEventDto {
  @ApiProperty({ example: 'goal', required: false })
  @IsString()
  @IsOptional()
  eventType?: string;

  @ApiProperty({ example: 1, required: false })
  @IsInt()
  @IsOptional()
  clubId?: number;

  @ApiProperty({ example: 1, required: false })
  @IsInt()
  @IsOptional()
  playerId?: number;

  @ApiProperty({ example: 45, required: false })
  @IsInt()
  @IsOptional()
  minute?: number;

  @ApiProperty({ example: 'Goal scored', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}

/**
 * DTO for match event response
 */
export class MatchEventResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  matchId: number;

  @ApiProperty({ example: 1 })
  clubId: number;

  @ApiProperty({ example: 'goal' })
  eventType: string;

  @ApiProperty({ example: 1, required: false })
  playerId?: number;

  @ApiProperty({ example: 45, required: false })
  minute?: number;

  @ApiProperty({ example: 'Goal scored', required: false })
  description?: string;

  @ApiProperty()
  createdAt?: Date;
}
