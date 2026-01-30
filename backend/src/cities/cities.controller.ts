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
import { CitiesService } from './cities.service';
import { CreateCityDto, PaginationDto, UpdateCityDto, CityResponseDto, FilteringDto } from '../common/dtos';

/**
 * Controller for managing city-related data.
 * Provides endpoints for CRUD operations on cities and filtering by country.
 */
@ApiTags('cities')
@Controller({ path: 'cities', version: '1' })
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  /**
   * GET /cities
   * Retrieve all cities, optionally filtered by country
   */
  @ApiOperation({ summary: 'Retrieve all cities (paginated)' })
  @ApiOkResponse({
    description: 'A paginated list of cities.',
    schema: {
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/CityResponseDto' } },
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
      return this.citiesService.findByCountry(parseInt(countryId, 10), { page, limit });
    }
    return this.citiesService.findAll({ page, limit }, filteringDto);
  }

  /**
   * GET /cities/:id
   * Retrieve city by ID
   */
  @ApiOperation({ summary: 'Retrieve a city by ID' })
  @ApiResponse({ status: 200, description: 'The city details' })
  @ApiResponse({ status: 404, description: 'City not found' })
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<CityResponseDto> {
    return this.citiesService.findOne(id);
  }

  /**
   * POST /cities
   * Create a new city
   */
  @ApiOperation({ summary: 'Create a new city' })
  @ApiResponse({ status: 201, description: 'The city has been successfully created.' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createCityDto: CreateCityDto): Promise<CityResponseDto> {
    return this.citiesService.create(createCityDto);
  }

  /**
   * PUT /cities/:id
   * Update an existing city
   */
  @ApiOperation({ summary: 'Update a city' })
  @ApiResponse({ status: 200, description: 'The city has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'City not found' })
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCityDto: UpdateCityDto,
  ): Promise<CityResponseDto> {
    return this.citiesService.update(id, updateCityDto);
  }

  /**
   * DELETE /cities/:id
   * Delete a city
   */
  @ApiOperation({ summary: 'Delete a city' })
  @ApiResponse({ status: 204, description: 'The city has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'City not found' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.citiesService.remove(id);
  }
}