import { ApiProperty } from '@nestjs/swagger';

export class CreateSportClubDto {
  @ApiProperty({ description: 'The ID of the sport', example: 1 })
  sportId: number;

  @ApiProperty({ description: 'The ID of the club', example: 5 })
  clubId: number;

  @ApiProperty({ description: 'Whether the club is active in this sport', example: true, default: true })
  flgActive?: boolean;
}
