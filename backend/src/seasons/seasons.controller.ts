import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SeasonsService } from './seasons.service';

@ApiTags('seasons')
@Controller({ path: 'seasons', version: '1' })
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('leagueId') leagueId?: string,
  ) {
    // If leagueId is provided, return seasons filtered by league
    if (leagueId) {
      return this.seasonsService.findAllByLeague(Number(leagueId));
    }

    // Otherwise use pagination
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const sort = sortBy || 'startYear';
    const order = sortOrder === 'desc' ? 'desc' : 'asc';

    return this.seasonsService.findAllPaginated(pageNum, limitNum, sort, order);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a season by ID' })
  @ApiResponse({ status: 200, description: 'The season details' })
  @ApiResponse({ status: 404, description: 'Season not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.seasonsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new season' })
  @ApiResponse({ status: 201, description: 'Season created successfully' })
  async create(@Body() createDto: any) {
    return this.seasonsService.create(createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a season' })
  @ApiResponse({ status: 200, description: 'Season updated successfully' })
  @ApiResponse({ status: 404, description: 'Season not found' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: any) {
    return this.seasonsService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a season' })
  @ApiResponse({ status: 200, description: 'Season deleted successfully' })
  @ApiResponse({ status: 404, description: 'Season not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.seasonsService.remove(id);
  }
}
