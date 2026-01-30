import { Controller, Get, Post, Body, Put, Param, Delete, ParseIntPipe, Version } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ClubStadiumsService } from './club-stadiums.service';
import { CreateClubStadiumDto } from './dto/create-club-stadium.dto';
import { UpdateClubStadiumDto } from './dto/update-club-stadium.dto';

@ApiTags('Club Stadiums')
@Controller('club-stadiums')
export class ClubStadiumsController {
  constructor(private readonly clubStadiumsService: ClubStadiumsService) {}

  @Post()
  @Version('1')
  @ApiOperation({ summary: 'Create a new club-stadium relationship' })
  @ApiResponse({ status: 201, description: 'Club stadium created successfully' })
  create(@Body() createClubStadiumDto: CreateClubStadiumDto) {
    return this.clubStadiumsService.create(createClubStadiumDto);
  }

  @Get()
  @Version('1')
  @ApiOperation({ summary: 'Get all club-stadium relationships' })
  @ApiResponse({ status: 200, description: 'List of all club stadiums' })
  findAll() {
    return this.clubStadiumsService.findAll();
  }

  @Get('club/:clubId')
  @Version('1')
  @ApiOperation({ summary: 'Get all stadium relationships for a specific club' })
  @ApiResponse({ status: 200, description: 'List of stadiums for the club' })
  findByClub(@Param('clubId', ParseIntPipe) clubId: number) {
    return this.clubStadiumsService.findByClub(clubId);
  }

  @Get('club/:clubId/active')
  @Version('1')
  @ApiOperation({ summary: 'Get the active stadium for a specific club' })
  @ApiResponse({ status: 200, description: 'Active stadium for the club' })
  findActiveByClub(@Param('clubId', ParseIntPipe) clubId: number) {
    return this.clubStadiumsService.findActiveByClub(clubId);
  }

  @Get(':id')
  @Version('1')
  @ApiOperation({ summary: 'Get a specific club-stadium relationship' })
  @ApiResponse({ status: 200, description: 'Club stadium details' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clubStadiumsService.findOne(id);
  }

  @Put(':id')
  @Version('1')
  @ApiOperation({ summary: 'Update a club-stadium relationship' })
  @ApiResponse({ status: 200, description: 'Club stadium updated successfully' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateClubStadiumDto: UpdateClubStadiumDto) {
    return this.clubStadiumsService.update(id, updateClubStadiumDto);
  }

  @Delete(':id')
  @Version('1')
  @ApiOperation({ summary: 'Delete a club-stadium relationship' })
  @ApiResponse({ status: 200, description: 'Club stadium deleted successfully' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.clubStadiumsService.remove(id);
  }
}
