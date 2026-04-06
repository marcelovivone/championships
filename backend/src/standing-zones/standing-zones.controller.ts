import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StandingZonesService } from './standing-zones.service';
import { CreateStandingZoneDto, UpdateStandingZoneDto, StandingZoneResponseDto } from '../common/dtos';

@ApiTags('Standing Zones')
@Controller({ path: 'standing-zones', version: '1' })
export class StandingZonesController {
  constructor(private readonly service: StandingZonesService) {}

  @Get()
  @ApiOperation({ summary: 'List standing zones (filtered)' })
  async findAll(
    @Query('sportId') sportId?: string,
    @Query('leagueId') leagueId?: string,
    @Query('seasonId') seasonId?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('sortBy') sortBy = 'startPosition',
    @Query('sortOrder') sortOrder = 'asc',
  ) {
    const params = {
      sportId: sportId ? parseInt(sportId, 10) : undefined,
      leagueId: leagueId ? parseInt(leagueId, 10) : undefined,
      seasonId: seasonId ? parseInt(seasonId, 10) : undefined,
      page: parseInt(page as any, 10) || 1,
      limit: parseInt(limit as any, 10) || 50,
      sortBy: sortBy || 'startPosition',
      sortOrder: sortOrder === 'desc' ? 'desc' : 'asc',
    } as any;

    return this.service.findAll(params);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<StandingZoneResponseDto> {
    return this.service.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateStandingZoneDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStandingZoneDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return { success: true };
  }
}
