import { ApiProperty } from '@nestjs/swagger';

export class CreateSportClubDto {
  @ApiProperty({ description: 'The ID of the sport', example: 1 })
  sportId: number;

  @ApiProperty({ description: 'The ID of the club', example: 5 })
  clubId: number;

  @ApiProperty({ description: 'The name of the club in the context of the sport', example: 'Arsenal FC for football, Arsenal Basketball for basketball' })
  name: string;

  @ApiProperty({ description: 'Whether the club is active in this sport', example: true, default: true })
  flgActive?: boolean;
}