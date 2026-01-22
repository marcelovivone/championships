import { ApiProperty } from '@nestjs/swagger';

export class CreateSeasonClubDto {
  @ApiProperty({ description: 'The ID of the season', example: 1 })
  seasonId: number;

  @ApiProperty({ description: 'The ID of the club', example: 5 })
  clubId: number;

  @ApiProperty({ description: 'Date when the club joined the season', example: '2025-08-01T00:00:00Z' })
  joinDate: Date;
}
