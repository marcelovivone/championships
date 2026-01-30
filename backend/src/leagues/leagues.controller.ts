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
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { LeaguesService } from './leagues.service';
import { CreateLeagueDto, PaginationDto, UpdateLeagueDto, LeagueResponseDto, FilteringDto } from '../common/dtos';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserProfile } from '../common/dtos/user.dto';

/**
 * Controller for managing league-related data.
 * Provides endpoints for CRUD operations on leagues, filtering by sport.
 */
@ApiTags('leagues')
@Controller({ path: 'leagues', version: '1' })
export class LeaguesController {
  constructor(private readonly leaguesService: LeaguesService) {}

  /**
   * GET /leagues
   * Retrieve all leagues, optionally filtered by sport
   */
  @ApiOperation({ summary: 'Retrieve all leagues (paginated)' })
  @ApiOkResponse({
    description: 'A paginated list of leagues.',
    schema: {
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/LeagueResponseDto' } },
        total: { type: 'number', example: 50 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
      },
    },
  })
  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('sportId') sportId?: string,
  ) {
    // If sportId is provided, return leagues filtered by sport
    if (sportId) {
      return this.leaguesService.findAllBySport(Number(sportId));
    }

    // Otherwise use pagination
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const sort = sortBy || 'originalName';
    const order = sortOrder === 'desc' ? 'desc' : 'asc';

    return this.leaguesService.findAllPaginated(pageNum, limitNum, sort, order);
  }

  /**
   * GET /leagues/:id
   * Retrieve league by ID with full details
   */
  @ApiOperation({ summary: 'Retrieve a league by ID' })
  @ApiResponse({ status: 200, description: 'The league details' })
  @ApiResponse({ status: 404, description: 'League not found' })
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<LeagueResponseDto> {
    return this.leaguesService.findOne(id);
  }

  /**
   * POST /leagues
   * Create a new league
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserProfile.ADMIN)
  @ApiOperation({ summary: 'Create a new league' })
  @ApiResponse({ status: 201, description: 'The league has been successfully created.' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createLeagueDto: CreateLeagueDto): Promise<LeagueResponseDto> {
    return this.leaguesService.create(createLeagueDto);
  }

  /**
   * PUT /leagues/:id
   * Update an existing league
   */
  @ApiOperation({ summary: 'Update a league' })
  @ApiResponse({ status: 200, description: 'The league has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'League not found' })
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLeagueDto: UpdateLeagueDto,
  ): Promise<LeagueResponseDto> {
    return this.leaguesService.update(id, updateLeagueDto);
  }

  /**
   * DELETE /leagues/:id
   * Delete a league
   */
  @ApiOperation({ summary: 'Delete a league' })
  @ApiResponse({ status: 204, description: 'The league has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'League not found' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.leaguesService.remove(id);
  }

  /**
   * POST /leagues/:id/links
   * Add an external link to a league (e.g., official website, social media)
   */
  @ApiOperation({ summary: 'Add external link to league' })
  @ApiResponse({ status: 201, description: 'Link created' })
  @Post(':id/links')
  @HttpCode(HttpStatus.CREATED)
  async addLink(
    @Param('id', ParseIntPipe) leagueId: number,
    @Body() createLeagueLinkDto: any,
  ) {
    return this.leaguesService.addLink(leagueId, createLeagueLinkDto.label, createLeagueLinkDto.url);
  }

  /**
   * DELETE /leagues/:id/links/:linkId
   * Remove an external link from a league
   */
  @ApiOperation({ summary: 'Remove external link from league' })
  @ApiResponse({ status: 204, description: 'Link removed' })
  @Delete(':id/links/:linkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeLink(
    @Param('id', ParseIntPipe) leagueId: number,
    @Param('linkId', ParseIntPipe) linkId: number,
  ): Promise<void> {
    await this.leaguesService.removeLink(leagueId, linkId);
  }
}