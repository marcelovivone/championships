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
import { MatchDivisionsService } from './match-divisions.service';
import {
  CreateMatchDivisionDto,
  UpdateMatchDivisionDto,
  MatchDivisionResponseDto,
} from '../common/dtos';

/**
 * Controller for managing match division data (periods, sets, quarters, etc.).
 * Provides endpoints for CRUD operations on divisions within matches.
 */
@ApiTags('match-divisions')
@Controller({ path: 'match-divisions', version: '1' })
export class MatchDivisionsController {
  constructor(private readonly matchDivisionsService: MatchDivisionsService) {}

  /**
   * GET /match-divisions
   * Retrieve all match divisions, optionally filtered by match
   */
  @ApiOperation({ summary: 'Retrieve all match divisions' })
  @ApiResponse({ status: 200, description: 'List of match divisions' })
  @Get()
  async findAll(@Query('matchId') matchId?: string): Promise<MatchDivisionResponseDto[]> {
    if (matchId) {
      return this.matchDivisionsService.findByMatch(parseInt(matchId, 10));
    }
    return this.matchDivisionsService.findAll();
  }

  /**
   * GET /match-divisions/:id
   * Retrieve match division by ID
   */
  @ApiOperation({ summary: 'Retrieve a match division by ID' })
  @ApiResponse({ status: 200, description: 'The match division details' })
  @ApiResponse({ status: 404, description: 'Match division not found' })
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MatchDivisionResponseDto> {
    return this.matchDivisionsService.findOne(id);
  }

  /**
   * POST /match-divisions
   * Create a new match division
   */
  @ApiOperation({ summary: 'Create a new match division' })
  @ApiResponse({ status: 201, description: 'The match division has been successfully created.' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createMatchDivisionDto: CreateMatchDivisionDto,
  ): Promise<MatchDivisionResponseDto> {
    console.log('createMatchDivisionDto', createMatchDivisionDto);
    return this.matchDivisionsService.create(createMatchDivisionDto);
  }

  /**
   * PUT /match-divisions/:id
   * Update an existing match division
   */
  @ApiOperation({ summary: 'Update a match division' })
  @ApiResponse({ status: 200, description: 'The match division has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Match division not found' })
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMatchDivisionDto: UpdateMatchDivisionDto,
  ): Promise<MatchDivisionResponseDto> {
    return this.matchDivisionsService.update(id, updateMatchDivisionDto);
  }

  /**
   * DELETE /match-divisions/:id
   * Delete a match division
   */
  @ApiOperation({ summary: 'Delete a match division' })
  @ApiResponse({ status: 204, description: 'The match division has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Match division not found' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.matchDivisionsService.remove(id);
  }
}