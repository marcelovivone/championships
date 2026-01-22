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
import { PhasesService } from './phases.service';
import { CreatePhaseDto, UpdatePhaseDto, PhaseResponseDto } from '../common/dtos';

/**
 * Controller for managing phase-related data.
 * Provides endpoints for CRUD operations on phases within seasons.
 */
@ApiTags('phases')
@Controller('phases')
export class PhasesController {
  constructor(private readonly phasesService: PhasesService) {}

  /**
   * GET /phases
   * Retrieve all phases, optionally filtered by season
   */
  @ApiOperation({ summary: 'Retrieve all phases' })
  @ApiResponse({ status: 200, description: 'List of phases' })
  @Get()
  async findAll(@Query('seasonId') seasonId?: string): Promise<PhaseResponseDto[]> {
    if (seasonId) {
      return this.phasesService.findBySeason(parseInt(seasonId, 10));
    }
    return this.phasesService.findAll();
  }

  /**
   * GET /phases/:id
   * Retrieve phase by ID
   */
  @ApiOperation({ summary: 'Retrieve a phase by ID' })
  @ApiResponse({ status: 200, description: 'The phase details' })
  @ApiResponse({ status: 404, description: 'Phase not found' })
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<PhaseResponseDto> {
    return this.phasesService.findOne(id);
  }

  /**
   * POST /phases
   * Create a new phase
   */
  @ApiOperation({ summary: 'Create a new phase' })
  @ApiResponse({ status: 201, description: 'The phase has been successfully created.' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createPhaseDto: CreatePhaseDto): Promise<PhaseResponseDto> {
    return this.phasesService.create(createPhaseDto);
  }

  /**
   * PUT /phases/:id
   * Update an existing phase
   */
  @ApiOperation({ summary: 'Update a phase' })
  @ApiResponse({ status: 200, description: 'The phase has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Phase not found' })
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePhaseDto: UpdatePhaseDto,
  ): Promise<PhaseResponseDto> {
    return this.phasesService.update(id, updatePhaseDto);
  }

  /**
   * DELETE /phases/:id
   * Delete a phase
   */
  @ApiOperation({ summary: 'Delete a phase' })
  @ApiResponse({ status: 204, description: 'The phase has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Phase not found' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.phasesService.remove(id);
  }
}