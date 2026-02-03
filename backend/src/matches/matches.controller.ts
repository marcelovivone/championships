import {
  Controller,
  Version,
  Get,
  Post,
  Body,
  Put,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { MatchesService } from './matches.service';
import { CreateMatchDto, UpdateMatchDto, UpdateMatchScoreDto, MatchResponseDto } from '../common/dtos';
import {
  ApiTags,
  ApiResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('matches')
@Controller({ path: 'matches', version: '1' })
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  /**
   * POST /matches
   * Create a new match
   */
  @ApiOperation({ summary: 'Create a new match' })
  @ApiBody({ type: CreateMatchDto })
  @ApiResponse({ status: 201, description: 'Match created', type: MatchResponseDto })
  @Post()
  async create(@Body() createMatchDto: CreateMatchDto) {
    return this.matchesService.create(createMatchDto);
  }

  /**
   * GET /matches
   * Retrieve all matches, optionally filtered by group/round/sport/league/season
   */
  @ApiOperation({ summary: 'Retrieve all matches' })
  @ApiResponse({ status: 200, description: 'List of matches', type: MatchResponseDto, isArray: true })
  @Get()
  async findAll(
    @Query('groupId') groupId?: string,
    @Query('roundId') roundId?: string,
    @Query('sportId') sportId?: string,
    @Query('leagueId') leagueId?: string,
    @Query('seasonId') seasonId?: string,
    @Query('date') date?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ): Promise<MatchResponseDto[]> {
    // Check for specific filter combinations first
    
    // If date and seasonId are provided, filter by season and date
    if (date && seasonId) {
      const seasonIdNum = parseInt(seasonId, 10);
      if (isNaN(seasonIdNum) || seasonIdNum <= 0) {
        throw new BadRequestException('Invalid seasonId format. Must be a positive integer.');
      }
      return this.matchesService.findBySeasonAndDate(seasonIdNum, date);
    }
    
    if (roundId && seasonId) {
      const seasonIdNum = parseInt(seasonId, 10);
      if (isNaN(seasonIdNum) || seasonIdNum <= 0) {
        throw new BadRequestException('Invalid seasonId format. Must be a positive integer.');
      }
      const roundIdNum = parseInt(roundId, 10);
      if (isNaN(roundIdNum) || roundIdNum <= 0) {
        throw new BadRequestException('Invalid roundId format. Must be a positive integer.');
      }
      return this.matchesService.findBySeasonAndRound(seasonIdNum, roundIdNum);
    }

    // If sportId, leagueId, seasonId are provided (with optional groupId), filter by all
    if (sportId && leagueId && seasonId) {
      try {
        const sportIdNum = parseInt(sportId, 10);
        const leagueIdNum = parseInt(leagueId, 10);
        const seasonIdNum = parseInt(seasonId, 10);
        
        if (isNaN(sportIdNum) || sportIdNum <= 0 ||
            isNaN(leagueIdNum) || leagueIdNum <= 0 ||
            isNaN(seasonIdNum) || seasonIdNum <= 0) {
          throw new BadRequestException('sportId, leagueId and seasonId must be positive integers.');
        }
        
        const groupIdValue = groupId ? parseInt(groupId, 10) : null;
        if (groupId && (isNaN(groupIdValue) || groupIdValue <= 0)) {
          throw new BadRequestException('groupId must be a positive integer if provided.');
        }

        return this.matchesService.findBySportLeagueSeasonAndGroup(
          sportIdNum,
          leagueIdNum,
          seasonIdNum,
          groupIdValue
        );
      } catch (error) {
        throw new BadRequestException('Invalid filter parameters');
      }
    }
    
    // // Then check individual filters
    // if (roundId) {
    //   const roundIdNum = parseInt(roundId, 10);
    //   if (isNaN(roundIdNum) || roundIdNum <= 0) {
    //     throw new BadRequestException('roundId must be a positive integer');
    //   }
    //   return this.matchesService.findByRound(roundIdNum);
    // }
    
    if (groupId) {
      const groupIdNum = parseInt(groupId, 10);
      if (isNaN(groupIdNum) || groupIdNum <= 0) {
        throw new BadRequestException('groupId must be a positive integer');
      }
      return this.matchesService.findByGroup(groupIdNum);
    }

    // Otherwise use pagination - validate and parse parameters
    let pageNum = 1;
    let limitNum = 10;
    let sort = 'date';
    let order: 'asc' | 'desc' = 'asc';

    if (page !== undefined) {
      const parsedPage = parseInt(page, 10);
      if (!isNaN(parsedPage) && parsedPage > 0) {
        pageNum = parsedPage;
      } else {
        throw new BadRequestException('page must be a positive integer');
      }
    }

    if (limit !== undefined) {
      const parsedLimit = parseInt(limit, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limitNum = parsedLimit;
      } else {
        throw new BadRequestException('limit must be a positive integer');
      }
    }

    if (sortBy !== undefined && sortBy.trim() !== '') {
      sort = sortBy;
    }

    if (sortOrder !== undefined && (sortOrder === 'desc' || sortOrder === 'asc')) {
      order = sortOrder as 'asc' | 'desc';
    }

    const result = await this.matchesService.findAllPaginated(pageNum, limitNum, sort, order);
    return result.data; // Return only the data array to match the expected return type
  }

  /**
   * GET /matches/:id
   * Retrieve a specific match by ID
   */
  @ApiOperation({ summary: 'Retrieve a specific match' })
  @ApiParam({ name: 'id', description: 'Match ID' })
  @ApiResponse({ status: 200, description: 'Match found', type: MatchResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Match not found' })
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    if (!id || id <= 0) {
      throw new BadRequestException('id must be a positive integer');
    }
    return this.matchesService.findOne(id);
  }


  /**
   * PUT /matches/:id
   * Update an existing match
   */
  @ApiOperation({ summary: 'Update a match' })
  @ApiResponse({ status: 200, description: 'The match has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Match not found' })
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMatchDto: UpdateMatchDto,
  ): Promise<MatchResponseDto> {
    return this.matchesService.update(id, updateMatchDto);
  }

  /**
   * PATCH /matches/:id
   * Update a specific match by ID
   */
//   @ApiOperation({ summary: 'Update a specific match' })
//   @ApiParam({ name: 'id', description: 'Match ID' })
//   @ApiBody({ type: UpdateMatchDto })
//   @ApiResponse({ status: 200, description: 'Match updated', type: MatchResponseDto })
//   @ApiResponse({ status: 400, description: 'Invalid input' })
//   @ApiResponse({ status: 404, description: 'Match not found' })
//   @Patch(':id')
//   async update(
//     @Param('id', ParseIntPipe) id: number,
//     @Body() updateMatchDto: UpdateMatchDto,
//   ) {
//     if (!id || id <= 0) {
//       throw new BadRequestException('id must be a positive integer');
//     }
//     return this.matchesService.update(id, updateMatchDto);
//   }

  /**
   * PATCH /matches/:id/score
   * Update match score
   */
  @ApiOperation({ summary: 'Update match score' })
  @ApiParam({ name: 'id', description: 'Match ID' })
  @ApiBody({ type: UpdateMatchScoreDto })
  @ApiResponse({ status: 200, description: 'Match score updated', type: MatchResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Match not found' })
  @Patch(':id/score')
  async updateScore(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateScoreDto: UpdateMatchScoreDto,
  ) {
    if (!id || id <= 0) {
      throw new BadRequestException('id must be a positive integer');
    }
    return this.matchesService.updateScore(id, updateScoreDto);
  }

  /**
   * DELETE /matches/:id
   * Delete a specific match by ID
   */
  @ApiOperation({ summary: 'Delete a specific match' })
  @ApiParam({ name: 'id', description: 'Match ID' })
  @ApiResponse({ status: 200, description: 'Match deleted', type: MatchResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Match not found' })
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    if (!id || id <= 0) {
      throw new BadRequestException('id must be a positive integer');
    }
    return this.matchesService.remove(id);
  }
}