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
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StandingsService } from './standings.service';
import { CreateStandingDto, UpdateStandingDto, StandingResponseDto } from '../common/dtos';

/**
 * Controller for managing standings data.
 * Provides endpoints for retrieving standings filtered by league and round.
 */
@ApiTags('standings')
@Controller({ path: 'standings', version: '1' })
export class StandingsController {
  constructor(private readonly standingsService: StandingsService) {}

  private toStandingResponseDto(standing: any): StandingResponseDto {
    let matchDateValue = standing.matchDate;
    if (standing.matchDate instanceof Date) {
      matchDateValue = !isNaN(standing.matchDate.getTime())
        ? standing.matchDate.toISOString()
        : null;
    } else if (typeof standing.matchDate === 'string') {
      // Try to parse string to Date and check validity
      const parsed = new Date(standing.matchDate);
      matchDateValue = !isNaN(parsed.getTime()) ? parsed.toISOString() : null;
    } else if (!standing.matchDate) {
      matchDateValue = null;
    }
    return {
      ...standing,
      matchDate: matchDateValue,
    };
  }

      /**
     * GET /standings?leagueId=...&seasonId=...&roundId=...
     * Retrieve standings by league, season, and round
     */
    @Get()
    async getByLeagueSeasonRoundOrMatchDate(
      @Query('leagueId') leagueId?: string,
      @Query('seasonId') seasonId?: string,
      @Query('roundId') roundId?: string,
      @Query('matchDate') matchDate?: string,
      @Query('clubId') clubId?: string,
    ): Promise<StandingResponseDto[]> {
      if (leagueId && seasonId && roundId) {
        const standings = await this.standingsService.findByLeagueIdAndSeasonIdAndRoundId(
          parseInt(leagueId, 10),
          parseInt(seasonId, 10),
          parseInt(roundId, 10),
          clubId ? parseInt(clubId, 10) : undefined,
        );
        return standings.map(this.toStandingResponseDto);
      }
      if (leagueId && seasonId && matchDate) {
        const standings = await this.standingsService.findByLeagueIdAndSeasonIdAndMatchDate(
          parseInt(leagueId, 10),
          parseInt(seasonId, 10),
          matchDate,
          clubId ? parseInt(clubId, 10) : undefined,
        );
        return standings.map(this.toStandingResponseDto);
      }
      // fallback to existing logic
      return this.findAll(undefined, undefined);
    }

  /**
   * GET /standings
   * Retrieve standings, optionally filtered by league and round
   */
  @ApiOperation({ summary: 'Retrieve standings' })
  @ApiResponse({ status: 200, description: 'List of standings' })
  @Get()
  async findAll(
    @Query('roundId') roundId?: string,
    @Query('matchDate') matchDate?: string,
  ): Promise<StandingResponseDto[]> {
    // Only one filter can be used at a time
    if (roundId && matchDate) {
      throw new Error('Provide only one filter: either roundId or matchDate, not both.');
    }
    if (roundId) {
      const standings = await this.standingsService.findByRound(parseInt(roundId, 10));
      return standings.map(this.toStandingResponseDto);
    }
    if (matchDate) {
      const standings = await this.standingsService.findByMatchDate(matchDate);
      return standings.map(this.toStandingResponseDto);
    }
    // Remove leagueId logic, only roundId or matchDate allowed
    const standings = await this.standingsService.findAll();
    return standings.map(this.toStandingResponseDto);
  }

  /**
   * GET /standings/:id
   * Retrieve standing by ID
   */
  @ApiOperation({ summary: 'Retrieve a standing by ID' })
  @ApiResponse({ status: 200, description: 'The standing details' })
  @ApiResponse({ status: 404, description: 'Standing not found' })
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<StandingResponseDto> {
    const standing = await this.standingsService.findOne(id);
    return this.toStandingResponseDto(standing);
  }

  /**
   * POST /standings
   * Create a new standing entry
   */
  @ApiOperation({ summary: 'Create a new standing entry' })
  @ApiResponse({ status: 201, description: 'The standing has been successfully created.' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createStandingDto: CreateStandingDto): Promise<StandingResponseDto> {
    const standing = await this.standingsService.create(createStandingDto);
    return this.toStandingResponseDto(standing);
  }

//   /**
//    * PUT /standings/:id
//    * Update an existing standing entry
//    */
//   @ApiOperation({ summary: 'Update a standing entry' })
//   @ApiResponse({ status: 200, description: 'The standing has been successfully updated.' })
//   @ApiResponse({ status: 404, description: 'Standing not found' })
//   @Put(':id')
//   async update(
//     @Param('id', ParseIntPipe) id: number,
//     @Body() updateStandingDto: UpdateStandingDto,
//   ): Promise<StandingResponseDto> {
//     const standing = await this.standingsService.update(id, updateStandingDto);
//     return this.toStandingResponseDto(standing);
//   }

  /**
   * DELETE /standings/strict
   * Delete a standing for club/league/season only if no later standing exists
   * Used for both home and away club deletes
   */
  @ApiOperation({ summary: 'Strict delete: only if no later standing exists for club/league/season' })
  @ApiResponse({ status: 204, description: 'Standing deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete: later standing exists' })
  @ApiResponse({ status: 404, description: 'Standing not found' })
  @Delete('strict')
  @HttpCode(HttpStatus.NO_CONTENT)
  async strictRemove(
    @Query('matchId') matchId?: number,
    @Query('standingId') standingId?: number,
  ): Promise<void> {
    if (matchId) {
      await this.standingsService.removeByMatchId(matchId);
    } else if (standingId) {
      // Fallback for legacy: delete by standingId
      await this.standingsService.removeByClubLeagueSeason(0, 0, 0, standingId);
    } else {
        throw new BadRequestException('matchId or standingId required');
    }
  }

  /**
   * DELETE /standings/:id
   * Delete a standing entry
   */
  @ApiOperation({ summary: 'Delete a standing entry' })
  @ApiResponse({ status: 204, description: 'The standing has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Standing not found' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.standingsService.remove(id);
  }
}