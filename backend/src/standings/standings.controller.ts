import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StandingsService } from './standings.service';
import { CreateStandingDto, UpdateStandingDto, StandingResponseDto } from '../common/dtos';

/**
 * Controller for managing standings data.
 * Provides endpoints for retrieving standings filtered by league and round.
 */
@ApiTags('standings')
@Controller({ path: 'standings', version: '1' })
export class StandingsController {
  constructor(private readonly standingsService: StandingsService) {}

  /**
   * GET /standings
   * Retrieve standings, optionally filtered by league and round
   */
  @ApiOperation({ summary: 'Retrieve standings' })
  @ApiResponse({ status: 200, description: 'List of standings' })
  @Get()
  async findAll(
    @Query('leagueId') leagueId?: string,
    @Query('roundId') roundId?: string,
  ): Promise<StandingResponseDto[]> {
    if (roundId && leagueId) {
      return this.standingsService.findByLeagueAndRound(
        parseInt(leagueId, 10),
        parseInt(roundId, 10),
      );
    }
    if (leagueId) {
      return this.standingsService.findByLeague(parseInt(leagueId, 10));
    }
    return this.standingsService.findAll();
  }

  /**
   * GET /standings/:id
   * Retrieve standing by ID
   */
  @ApiOperation({ summary: 'Retrieve a standing by ID' })
  @ApiResponse({ status: 200, description: 'The standing details' })
  @ApiResponse({ status: 404, description: 'Standing not found' })
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<StandingResponseDto> {
    return this.standingsService.findOne(id);
  }

  /**
   * POST /standings
   * Create a new standing entry
   */
  @ApiOperation({ summary: 'Create a new standing entry' })
  @ApiResponse({ status: 201, description: 'The standing has been successfully created.' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createStandingDto: CreateStandingDto): Promise<StandingResponseDto> {
    return this.standingsService.create(createStandingDto);
  }

  /**
   * PUT /standings/:id
   * Update an existing standing entry
   */
  @ApiOperation({ summary: 'Update a standing entry' })
  @ApiResponse({ status: 200, description: 'The standing has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Standing not found' })
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStandingDto: UpdateStandingDto,
  ): Promise<StandingResponseDto> {
    return this.standingsService.update(id, updateStandingDto);
  }

  /**
   * DELETE /standings/:id
   * Delete a standing entry
   */
  @ApiOperation({ summary: 'Delete a standing entry' })
  @ApiResponse({ status: 204, description: 'The standing has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Standing not found' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.standingsService.remove(id);
  }
}