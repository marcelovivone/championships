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
import { MatchEventsService } from './match-events.service';
import {
  CreateMatchEventDto,
  UpdateMatchEventDto,
  MatchEventResponseDto,
} from '../common/dtos';

/**
 * Controller for managing match event data (goals, fouls, substitutions, etc.).
 * Provides endpoints for CRUD operations on events within matches.
 */
@ApiTags('match-events')
@Controller({ path: 'match-events', version: '1' })
export class MatchEventsController {
  constructor(private readonly matchEventsService: MatchEventsService) {}

  /**
   * GET /match-events
   * Retrieve all match events, optionally filtered by match
   */
  @ApiOperation({ summary: 'Retrieve all match events' })
  @ApiResponse({ status: 200, description: 'List of match events' })
  @Get()
  async findAll(@Query('matchId') matchId?: string): Promise<MatchEventResponseDto[]> {
    if (matchId) {
      return this.matchEventsService.findByMatch(parseInt(matchId, 10));
    }
    return this.matchEventsService.findAll();
  }

  /**
   * GET /match-events/:id
   * Retrieve match event by ID
   */
  @ApiOperation({ summary: 'Retrieve a match event by ID' })
  @ApiResponse({ status: 200, description: 'The match event details' })
  @ApiResponse({ status: 404, description: 'Match event not found' })
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<MatchEventResponseDto> {
    return this.matchEventsService.findOne(id);
  }

  /**
   * POST /match-events
   * Create a new match event
   */
  @ApiOperation({ summary: 'Create a new match event' })
  @ApiResponse({ status: 201, description: 'The match event has been successfully created.' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createMatchEventDto: CreateMatchEventDto): Promise<MatchEventResponseDto> {
    return this.matchEventsService.create(createMatchEventDto);
  }

  /**
   * PUT /match-events/:id
   * Update an existing match event
   */
  @ApiOperation({ summary: 'Update a match event' })
  @ApiResponse({ status: 200, description: 'The match event has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Match event not found' })
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMatchEventDto: UpdateMatchEventDto,
  ): Promise<MatchEventResponseDto> {
    return this.matchEventsService.update(id, updateMatchEventDto);
  }

  /**
   * DELETE /match-events/:id
   * Delete a match event
   */
  @ApiOperation({ summary: 'Delete a match event' })
  @ApiResponse({ status: 204, description: 'The match event has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Match event not found' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.matchEventsService.remove(id);
  }
}