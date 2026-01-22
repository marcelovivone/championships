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
import { CountriesService } from './countries.service';
import { CreateCountryDto, UpdateCountryDto, CountryResponseDto, PaginationDto, FilteringDto } from '../common/dtos';

/**
 * Controller for managing country-related data.
 * Provides endpoints for CRUD operations on countries.
 */
@ApiTags('countries')
@Controller('countries')
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  /**
   * GET /countries
   * Retrieve all countries
   */
  @ApiOperation({ summary: 'Retrieve all countries (paginated, sorted, and filtered)' })
  @ApiOkResponse({
    description: 'A paginated list of countries.',
    schema: {
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/CountryResponseDto' } },
        total: { type: 'number', example: 50 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
      },
    },
  })
  @Get()
  async findAll(@Query() paginationDto: PaginationDto, @Query() filteringDto: FilteringDto) {
    return this.countriesService.findAll(paginationDto, filteringDto);
  }

  /**
   * GET /countries/:id
   * Retrieve country by ID
   */
  @ApiOperation({ summary: 'Retrieve a country by ID' })
  @ApiResponse({ status: 200, description: 'The country details', type: CountryResponseDto })
  @ApiResponse({ status: 404, description: 'Country not found' })
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CountryResponseDto> {
    return this.countriesService.findOne(id);
  }

  /**
   * GET /countries/continent/:continent
   * Filter countries by continent
   */
  @ApiOperation({ summary: 'Retrieve countries by continent' })
  @ApiResponse({ status: 200, description: 'List of countries in the continent', type: [CountryResponseDto] })
  @Get('continent/:continent')
  async findByContinent(
    @Param('continent') continent: string,
  ): Promise<CountryResponseDto[]> {
    return this.countriesService.findByContinent(continent);
  }

  /**
   * POST /countries
   * Create a new country
   */
  @ApiOperation({ summary: 'Create a new country' })
  @ApiResponse({ status: 201, description: 'The country has been successfully created.', type: CountryResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createCountryDto: CreateCountryDto): Promise<CountryResponseDto> {
    return this.countriesService.create(createCountryDto);
  }

  /**
   * PUT /countries/:id
   * Update an existing country
   */
  @ApiOperation({ summary: 'Update a country' })
  @ApiResponse({ status: 200, description: 'The country has been successfully updated.', type: CountryResponseDto })
  @ApiResponse({ status: 404, description: 'Country not found' })
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCountryDto: UpdateCountryDto,
  ): Promise<CountryResponseDto> {
    return this.countriesService.update(id, updateCountryDto);
  }

  /**
   * DELETE /countries/:id
   * Delete a country
   */
  @ApiOperation({ summary: 'Delete a country' })
  @ApiResponse({ status: 204, description: 'The country has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Country not found' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.countriesService.remove(id);
  }
}