import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiOkResponse } from '@nestjs/swagger';
import { SportsService } from './sports.service';
import { CreateSportDto, UpdateSportDto, SportResponseDto, PaginationDto, FilteringDto } from '../common/dtos';

/**
 * Sports Controller
 * Handles all HTTP requests related to sports management
 * 
 * Endpoints:
 * GET    /sports              - List all sports
 * GET    /sports/:id          - Get sport by ID
 * GET    /sports/type/:type   - Get sports by type (collective/individual)
 * POST   /sports              - Create new sport
 * PUT    /sports/:id          - Update sport
 * DELETE /sports/:id          - Delete sport
 */
@ApiTags('sports')
@Controller({ path: 'sports', version: '1' })
export class SportsController {
  constructor(private readonly sportsService: SportsService) {}

  /**
   * GET /sports
   * Returns all available sports with their rules
   */
  @ApiOperation({ summary: 'Retrieve all sports (paginated)' })
  @ApiOkResponse({
    description: 'A paginated list of sports.',
    schema: {
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/SportResponseDto' } },
        total: { type: 'number', example: 6 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
      },
    },
  })
  @Get()
  async findAll(@Query() paginationDto: PaginationDto, @Query() filteringDto: FilteringDto) {
    return this.sportsService.findAll(paginationDto, filteringDto);
  }

  /**
   * GET /sports/:id
   * Returns a specific sport by ID
   * 
   * @param id - Sport ID
   */
  @ApiOperation({ summary: 'Retrieve a sport by ID' })
  @ApiResponse({ status: 200, description: 'The sport details', type: SportResponseDto })
  @ApiResponse({ status: 404, description: 'Sport not found' })
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<SportResponseDto> {
    return this.sportsService.findOne(+id);
  }

  /**
   * GET /sports/type/:type
   * Returns all sports of a specific type
   * 
   * @param type - 'collective' or 'individual'
   */
  @ApiOperation({ summary: 'Retrieve sports by type' })
  @ApiResponse({ status: 200, description: 'List of sports of the given type', type: [SportResponseDto] })
  @Get('type/:type')
  async findByType(@Param('type') type: 'collective' | 'individual') {
    return this.sportsService.findByType(type);
  }

  /**
   * POST /sports
   * Creates a new sport
   * 
   * @body CreateSportDto - Sport data to create
   */
  @ApiOperation({ summary: 'Create a new sport' })
  @ApiResponse({ status: 201, description: 'The sport has been successfully created.', type: SportResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createSportDto: CreateSportDto): Promise<SportResponseDto> {
    return this.sportsService.create(createSportDto);
  }

  /**
   * PUT /sports/:id
   * Updates an existing sport
   * 
   * @param id - Sport ID to update
   * @body UpdateSportDto - Updated sport data
   */
  @ApiOperation({ summary: 'Update a sport' })
  @ApiResponse({ status: 200, description: 'The sport has been successfully updated.', type: SportResponseDto })
  @ApiResponse({ status: 404, description: 'Sport not found' })
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateSportDto: UpdateSportDto,
  ): Promise<SportResponseDto> {
    return this.sportsService.update(+id, updateSportDto);
  }

  /**
   * DELETE /sports/:id
   * Deletes a sport
   * 
   * @param id - Sport ID to delete
   */
  @ApiOperation({ summary: 'Delete a sport' })
  @ApiResponse({ status: 204, description: 'The sport has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Sport not found' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.sportsService.remove(+id);
  }
}