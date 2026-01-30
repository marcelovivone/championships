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
import { RoundsService } from './rounds.service';
import { CreateRoundDto, UpdateRoundDto, RoundResponseDto } from '../common/dtos';

/**
 * Controller for managing round-related data.
 * Provides endpoints for CRUD operations on rounds within leagues/seasons.
 */
@ApiTags('rounds')
@Controller({ path: 'rounds', version: '1' })
export class RoundsController {
  constructor(private readonly roundsService: RoundsService) {}

  /**
   * GET /rounds
   * Retrieve all rounds, optionally filtered by season or league
   */
  @ApiOperation({ summary: 'Retrieve all rounds' })
  @ApiResponse({ status: 200, description: 'List of rounds' })
  @Get()
  async findAll(
    @Query('seasonId') seasonId?: string,
    @Query('leagueId') leagueId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ): Promise<any> {
    if (seasonId) {
      return this.roundsService.findBySeason(parseInt(seasonId, 10));
    }
    if (leagueId) {
      return this.roundsService.findByLeague(parseInt(leagueId, 10));
    }
    
    // Handle pagination
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const sort = sortBy || 'roundNumber';
    const order = sortOrder === 'desc' ? 'desc' : 'asc';

    return this.roundsService.findAllPaginated(pageNum, limitNum, sort, order);
  }

  /**
   * GET /rounds/:id
   * Retrieve round by ID
   */
  @ApiOperation({ summary: 'Retrieve a round by ID' })
  @ApiResponse({ status: 200, description: 'The round details' })
  @ApiResponse({ status: 404, description: 'Round not found' })
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<RoundResponseDto> {
    return this.roundsService.findOne(id);
  }

  /**
   * POST /rounds
   * Create a new round
   */
  @ApiOperation({ summary: 'Create a new round' })
  @ApiResponse({ status: 201, description: 'Round created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @Post()
  @HttpCode(HttpStatus.OK)
  async create(@Body() createRoundDto: CreateRoundDto): Promise<any> {
    try {
      const result = await this.roundsService.create(createRoundDto);
      return { success: true, data: result };
    } catch (error) {
      // Extract message from NestJS exceptions or regular errors
      let message = 'Failed to create round';
      if (error?.response?.message) {
        // NestJS exception format
        message = Array.isArray(error.response.message) 
          ? error.response.message.join(', ') 
          : error.response.message;
      } else if (error?.message) {
        message = error.message;
      }
      return { success: false, message };
    }
  }

  /**
   * PUT /rounds/:id
   * Update an existing round
   */
  @ApiOperation({ summary: 'Update a round' })
  @ApiResponse({ status: 200, description: 'Round updated successfully' })
  @ApiResponse({ status: 404, description: 'Round not found' })
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoundDto: UpdateRoundDto,
  ): Promise<any> {
    try {
      const result = await this.roundsService.update(id, updateRoundDto);
      return { success: true, data: result };
    } catch (error) {
      // Extract message from NestJS exceptions or regular errors
      let message = 'Failed to update round';
      if (error?.response?.message) {
        // NestJS exception format
        message = Array.isArray(error.response.message) 
          ? error.response.message.join(', ') 
          : error.response.message;
      } else if (error?.message) {
        message = error.message;
      }
      return { success: false, message };
    }
  }

  /**
   * DELETE /rounds/:id
   * Delete a round
   */
  @ApiOperation({ summary: 'Delete a round' })
  @ApiResponse({ status: 204, description: 'Round deleted successfully' })
  @ApiResponse({ status: 404, description: 'Round not found' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.roundsService.remove(id);
  }
}
