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
import { ClubsService } from './clubs.service';
import { CreateClubDto, PaginationDto, UpdateClubDto, FilteringDto } from '../common/dtos';

/**
 * Controller for managing club-related data.
 * Provides endpoints for CRUD operations on clubs.
 */
@ApiTags('clubs')
@Controller({ path: 'clubs', version: '1' })
export class ClubsController {
  constructor(private readonly clubsService: ClubsService) {}

  /**
   * GET /clubs
   * Retrieve all clubs, optionally filtered by country
   */
  @ApiOperation({ summary: 'Retrieve all clubs (paginated)' })
  @ApiOkResponse({
    description: 'A paginated list of clubs.',
    schema: {
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/ClubResponseDto' } },
        total: { type: 'number', example: 50 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
      },
    },
  })
  @Get()
  async findAll(@Query() paginationDto: PaginationDto, @Query() filteringDto: FilteringDto, @Query('countryId') countryId?: string) {
    const { page, limit } = paginationDto;
    if (countryId) {
      return this.clubsService.findByCountry(parseInt(countryId, 10), { page, limit });
    }
    return this.clubsService.findAll({ page, limit }, filteringDto);
  }

  /**
   * GET /clubs/:id
   * Retrieve club by ID
   */
  @ApiOperation({ summary: 'Retrieve a club by ID' })
  @ApiResponse({ status: 200, description: 'The club details' })
  @ApiResponse({ status: 404, description: 'Club not found' })
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clubsService.findOne(id);
  }

  /**
   * POST /clubs
   * Create a new club
   */
  @ApiOperation({ summary: 'Create a new club' })
  @ApiResponse({ status: 201, description: 'The club has been successfully created.' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createClubDto: CreateClubDto) {
    return this.clubsService.create(createClubDto);
  }

  /**
   * PUT /clubs/:id
   * Update an existing club
   */
  @ApiOperation({ summary: 'Update a club' })
  @ApiResponse({ status: 200, description: 'The club has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Club not found' })
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClubDto: UpdateClubDto,
  ) {
    return this.clubsService.update(id, updateClubDto);
  }

  /**
   * DELETE /clubs/:id
   * Delete a club
   */
  @ApiOperation({ summary: 'Delete a club' })
  @ApiResponse({ status: 204, description: 'The club has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Club not found' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.clubsService.remove(id);
  }
}