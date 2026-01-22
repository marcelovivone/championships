import { ApiProperty } from '@nestjs/swagger';

export class UpdateSeasonClubDto {
  @ApiProperty({
    description: 'Date when the club left the season (NULL = still active)',
    example: '2026-05-31T23:59:59Z',
    required: false,
  })
  leaveDate?: Date;
}
