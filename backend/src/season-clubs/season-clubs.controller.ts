import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { SeasonClubsService } from './season-clubs.service';
import { CreateSeasonClubDto, UpdateSeasonClubDto, SeasonClubResponseDto } from './dto';

@ApiTags('season-clubs')
@Controller('season-clubs')
export class SeasonClubsController {
  constructor(private readonly seasonClubsService: SeasonClubsService) {}

  /**
   * Get all season-club associations
   */
  @Get()
  @ApiOperation({ summary: 'Retrieve all season-club associations' })
  @ApiResponse({
    status: 200,
    description: 'List of all season-club associations',
    type: [SeasonClubResponseDto],
  })
  async findAll(): Promise<SeasonClubResponseDto[]> {
    return await this.seasonClubsService.findAll();
  }

  /**
   * Get a specific season-club association
   */
  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a season-club association by ID' })
  @ApiParam({ name: 'id', description: 'The ID of the season-club association' })
  @ApiResponse({
    status: 200,
    description: 'The season-club association details',
    type: SeasonClubResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Season-club association not found' })
  async findOne(@Param('id') id: string): Promise<SeasonClubResponseDto> {
    return await this.seasonClubsService.findOne(parseInt(id));
  }

  /**
   * Get all clubs in a specific season
   */
  @Get('season/:seasonId')
  @ApiOperation({ summary: 'Retrieve all clubs in a specific season' })
  @ApiParam({ name: 'seasonId', description: 'The ID of the season' })
  @ApiResponse({
    status: 200,
    description: 'List of clubs in the season',
    type: [SeasonClubResponseDto],
  })
  async findBySeason(@Param('seasonId') seasonId: string): Promise<SeasonClubResponseDto[]> {
    return await this.seasonClubsService.findBySeason(parseInt(seasonId));
  }

  /**
   * Get all seasons a club participates in
   */
  @Get('club/:clubId')
  @ApiOperation({ summary: 'Retrieve all seasons a club participates in' })
  @ApiParam({ name: 'clubId', description: 'The ID of the club' })
  @ApiResponse({
    status: 200,
    description: 'List of seasons the club participates in',
    type: [SeasonClubResponseDto],
  })
  async findByClub(@Param('clubId') clubId: string): Promise<SeasonClubResponseDto[]> {
    return await this.seasonClubsService.findByClub(parseInt(clubId));
  }

  /**
   * Create a new season-club association
   */
  @Post()
  @ApiOperation({ summary: 'Create a new season-club association' })
  @ApiBody({ type: CreateSeasonClubDto, description: 'Season-club association details' })
  @ApiResponse({
    status: 201,
    description: 'Season-club association created successfully',
    type: SeasonClubResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input or association already exists' })
  async create(@Body() dto: CreateSeasonClubDto): Promise<SeasonClubResponseDto> {
    return await this.seasonClubsService.create(dto);
  }

  /**
   * Update a season-club association
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a season-club association' })
  @ApiParam({ name: 'id', description: 'The ID of the season-club association' })
  @ApiBody({ type: UpdateSeasonClubDto, description: 'Updated association details' })
  @ApiResponse({
    status: 200,
    description: 'Season-club association updated successfully',
    type: SeasonClubResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Season-club association not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSeasonClubDto,
  ): Promise<SeasonClubResponseDto> {
    return await this.seasonClubsService.update(parseInt(id), dto);
  }

  /**
   * Remove a season-club association
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Remove a season-club association' })
  @ApiParam({ name: 'id', description: 'The ID of the season-club association' })
  @ApiResponse({ status: 204, description: 'Season-club association deleted successfully' })
  @ApiResponse({ status: 404, description: 'Season-club association not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return await this.seasonClubsService.remove(parseInt(id));
  }
}