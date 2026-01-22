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
import { MatchesService } from './matches.service';
import {
  CreateMatchDto,
  UpdateMatchDto,
  MatchResponseDto,
  UpdateMatchScoreDto,
} from '../common/dtos';

/**
 * Controller for managing match-related data.
 * Provides endpoints for CRUD operations on matches and score updates.
 */
@ApiTags('matches')
@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  /**
   * GET /matches
   * Retrieve all matches, optionally filtered by phase/group/round
   */
  @ApiOperation({ summary: 'Retrieve all matches' })
  @ApiResponse({ status: 200, description: 'List of matches' })
  @Get()
  async findAll(
    @Query('phaseId') phaseId?: string,
    @Query('groupId') groupId?: string,
    @Query('roundId') roundId?: string,
  ): Promise<MatchResponseDto[]> {
    if (roundId) {
      return this.matchesService.findByRound(parseInt(roundId, 10));
    }
    if (groupId) {
      return this.matchesService.findByGroup(parseInt(groupId, 10));
    }
    if (phaseId) {
      return this.matchesService.findByPhase(parseInt(phaseId, 10));
    }
    return this.matchesService.findAll();
  }

  /**
   * GET /matches/:id
   * Retrieve match by ID with full details
   */
  @ApiOperation({ summary: 'Retrieve a match by ID' })
  @ApiResponse({ status: 200, description: 'The match details' })
  @ApiResponse({ status: 404, description: 'Match not found' })
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<MatchResponseDto> {
    return this.matchesService.findOne(id);
  }

  /**
   * POST /matches
   * Create a new match
   */
  @ApiOperation({ summary: 'Create a new match' })
  @ApiResponse({ status: 201, description: 'The match has been successfully created.' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createMatchDto: CreateMatchDto): Promise<MatchResponseDto> {
    return this.matchesService.create(createMatchDto);
  }

  /**
   * PUT /matches/:id
   * Update an existing match
   */
  @ApiOperation({ summary: 'Update a match' })
  @ApiResponse({ status: 200, description: 'The match has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Match not found' })
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMatchDto: UpdateMatchDto,
  ): Promise<MatchResponseDto> {
    return this.matchesService.update(id, updateMatchDto);
  }

  /**
   * PUT /matches/:id/score
   * Update match score and complete the match
   */
  @ApiOperation({ summary: 'Update match score' })
  @ApiResponse({ status: 200, description: 'Score updated and standings calculated' })
  @ApiResponse({ status: 404, description: 'Match not found' })
  @Put(':id/score')
  async updateScore(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateScoreDto: UpdateMatchScoreDto,
  ): Promise<MatchResponseDto> {
    return this.matchesService.updateScore(id, updateScoreDto);
  }

  /**
   * DELETE /matches/:id
   * Delete a match
   */
  @ApiOperation({ summary: 'Delete a match' })
  @ApiResponse({ status: 204, description: 'The match has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Match not found' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.matchesService.remove(id);
  }
}