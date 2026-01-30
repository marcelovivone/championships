import { ApiProperty } from '@nestjs/swagger';

export class UpdateSportClubDto {
  @ApiProperty({
    description: 'Whether the club is active in this sport',
    example: false,
    required: false,
  })
  flgActive?: boolean;
}
