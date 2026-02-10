import { ApiProperty } from '@nestjs/swagger';

export class UpdateSportClubDto {
  @ApiProperty({
    description: 'The name of the club in the context of the sport',
    example: 'Arsenal FC for football, Arsenal Basketball for basketball',
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: 'Whether the club is active in this sport',
    example: false,
    required: false,
  })
  flgActive?: boolean;
}