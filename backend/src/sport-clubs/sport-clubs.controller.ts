import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiOkResponse, ApiParam } from '@nestjs/swagger';
import { SportClubsService } from './sport-clubs.service';
import { CreateSportClubDto, UpdateSportClubDto, SportClubResponseDto } from './dto';

@ApiTags('sport-clubs')
@Controller({ path: 'sport-clubs', version: '1' })
export class SportClubsController {
  constructor(private readonly sportClubsService: SportClubsService) {}

  @ApiOperation({ summary: 'Retrieve all sport-club associations' })
  @ApiOkResponse({
    description: 'A list of all sport-club associations',
    type: [SportClubResponseDto],
  })
  @Get()
  async findAll() {
    return this.sportClubsService.findAll();
  }

  @ApiOperation({ summary: 'Retrieve a sport-club association by ID' })
  @ApiParam({ name: 'id', description: 'Sport-Club association ID' })
  @ApiOkResponse({
    description: 'The sport-club association',
    type: SportClubResponseDto,
  })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.sportClubsService.findOne(+id);
  }

  @ApiOperation({ summary: 'Get all clubs for a specific sport' })
  @ApiParam({ name: 'sportId', description: 'Sport ID' })
  @Get('sport/:sportId')
  async findBySport(@Param('sportId') sportId: string) {
    return this.sportClubsService.findBySport(+sportId);
  }

  @ApiOperation({ summary: 'Get all sports for a specific club' })
  @ApiParam({ name: 'clubId', description: 'Club ID' })
  @Get('club/:clubId')
  async findByClub(@Param('clubId') clubId: string) {
    return this.sportClubsService.findByClub(+clubId);
  }

  @ApiOperation({ summary: 'Create a new sport-club association' })
  @ApiResponse({
    status: 201,
    description: 'The sport-club association has been created',
    type: SportClubResponseDto,
  })
  @Post()
  async create(@Body() createDto: CreateSportClubDto) {
    return this.sportClubsService.create(createDto);
  }

  @ApiOperation({ summary: 'Bulk update clubs for a sport' })
  @ApiParam({ name: 'sportId', description: 'Sport ID' })
  @ApiResponse({
    status: 200,
    description: 'Clubs have been updated for the sport',
  })
  @Put('sport/:sportId/clubs')
  async bulkUpdateForSport(
    @Param('sportId') sportId: string,
    @Body() body: { sportClubData: { id: number; clubId: number; name: string }[] },
  ) {
    await this.sportClubsService.bulkUpdateForSportWithNames(+sportId, body.sportClubData);
    return { message: 'Sport-club associations updated successfully' };
  }

  @ApiOperation({ summary: 'Update a sport-club association' })
  @ApiParam({ name: 'id', description: 'Sport-Club association ID' })
  @ApiOkResponse({
    description: 'The sport-club association has been updated',
    type: SportClubResponseDto,
  })
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateSportClubDto) {
    return this.sportClubsService.update(+id, updateDto);
  }

  @ApiOperation({ summary: 'Delete a sport-club association' })
  @ApiParam({ name: 'id', description: 'Sport-Club association ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.sportClubsService.remove(+id);
  }
}
