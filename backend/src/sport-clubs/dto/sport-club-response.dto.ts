import { ApiProperty } from '@nestjs/swagger';

export class SportClubResponseDto {
  @ApiProperty({ description: 'The ID of the sport-club association', example: 1 })
  id: number;

  @ApiProperty({ description: 'The ID of the sport', example: 1 })
  sportId: number;

  @ApiProperty({ description: 'The ID of the club', example: 5 })
  clubId: number;

  @ApiProperty({ description: 'Whether the club is active in this sport', example: true })
  flgActive: boolean;

  @ApiProperty({ description: 'When the association was created', example: '2025-08-01T00:00:00Z' })
  createdAt: Date;
}
