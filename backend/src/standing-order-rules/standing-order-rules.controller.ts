import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { StandingOrderRulesService } from './standing-order-rules.service';
import { CreateStandingOrderRuleDto, UpdateStandingOrderRuleDto } from '../common/dtos';

@ApiTags('Standing Order Rules')
@Controller({ path: 'standing-order-rules', version: '1' })
export class StandingOrderRulesController {
  constructor(private readonly service: StandingOrderRulesService) {}

  @Get()
  @ApiOperation({ summary: 'List standing order rules (filtered by sportId, leagueId)' })
  async findAll(
    @Query('sportId') sportId?: string,
    @Query('leagueId') leagueId?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('sortBy') sortBy = 'sortOrder',
    @Query('sortOrder') sortOrder = 'asc',
  ) {
    const params = {
      sportId: sportId ? parseInt(sportId, 10) : undefined,
      leagueId: leagueId || undefined,
      page: parseInt(page as any, 10) || 1,
      limit: parseInt(limit as any, 10) || 50,
      sortBy: sortBy || 'sortOrder',
      sortOrder: sortOrder === 'desc' ? 'desc' : 'asc',
    } as any;

    return this.service.findAll(params);
  }

  @Get('resolve/:leagueId/:sportId/:year')
  @ApiOperation({ summary: 'Resolve effective rules for a league and season year' })
  async resolve(
    @Param('leagueId', ParseIntPipe) leagueId: number,
    @Param('sportId', ParseIntPipe) sportId: number,
    @Param('year', ParseIntPipe) year: number,
  ) {
    return this.service.resolveForLeagueAndSeason(leagueId, sportId, year);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateStandingOrderRuleDto) {
    return this.service.create(dto);
  }

  @Post('resequence')
  @ApiOperation({ summary: 'Re-sequence sort_order values back to 100, 200, 300...' })
  async resequence(
    @Body() body: { sportId: number; leagueId?: number | null; startYear?: number | null },
  ) {
    return this.service.resequence(body.sportId, body.leagueId ?? null, body.startYear ?? null);
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStandingOrderRuleDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return { success: true };
  }
}
