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
import { ApiTags, ApiOperation, ApiResponse, ApiOkResponse } from '@nestjs/swagger';
import { StadiumsService } from './stadiums.service';
import { CreateStadiumDto, PaginationDto, UpdateStadiumDto, StadiumResponseDto } from '../common/dtos';

/**
 * Controller for managing stadium-related data.
 * Provides endpoints for CRUD operations on stadiums and filtering by city/type.
 */
@ApiTags('stadiums')
@Controller('stadiums')
export class StadiumsController {
  constructor(private readonly stadiumsService: StadiumsService) {}

  /**
   * GET /stadiums
   * Retrieve all stadiums, optionally filtered by city or type
   */
  @ApiOperation({ summary: 'Retrieve all stadiums (paginated)' })
  @ApiOkResponse({
    description: 'A paginated list of stadiums.',
    schema: {
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/StadiumResponseDto' } },
        total: { type: 'number', example: 50 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
      },
    },
  })
  @Get()
  async findAll(
    @Query() paginationDto: PaginationDto,
    @Query('cityId') cityId?: string,
    @Query('type') type?: string,
  ) {
    if (cityId) {
      return this.stadiumsService.findByCity(parseInt(cityId, 10), paginationDto);
    }
    // Note: findByType is not paginated in this update, but can be added.
    return this.stadiumsService.findAll(paginationDto);
  }

  /**
   * GET /stadiums/:id
   * Retrieve stadium by ID
   */
  @ApiOperation({ summary: 'Retrieve a stadium by ID' })
  @ApiResponse({ status: 200, description: 'The stadium details' })
  @ApiResponse({ status: 404, description: 'Stadium not found' })
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<StadiumResponseDto> {
    return this.stadiumsService.findOne(id);
  }

  /**
   * POST /stadiums
   * Create a new stadium
   */
  @ApiOperation({ summary: 'Create a new stadium' })
  @ApiResponse({ status: 201, description: 'The stadium has been successfully created.' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createStadiumDto: CreateStadiumDto): Promise<StadiumResponseDto> {
    return this.stadiumsService.create(createStadiumDto);
  }

  /**
   * PUT /stadiums/:id
   * Update an existing stadium
   */
  @ApiOperation({ summary: 'Update a stadium' })
  @ApiResponse({ status: 200, description: 'The stadium has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Stadium not found' })
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStadiumDto: UpdateStadiumDto,
  ): Promise<StadiumResponseDto> {
    return this.stadiumsService.update(id, updateStadiumDto);
  }

  /**
   * DELETE /stadiums/:id
   * Delete a stadium
   */
  @ApiOperation({ summary: 'Delete a stadium' })
  @ApiResponse({ status: 204, description: 'The stadium has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Stadium not found' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.stadiumsService.remove(id);
  }
}