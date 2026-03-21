import { Controller, Post, Body, Get, Param, ParseIntPipe, Query, Delete, Patch, NotFoundException } from '@nestjs/common';
import { ApiService } from './api.service';

@Controller('api')
export class ApiController {
  constructor(private readonly apiService: ApiService) {}

  @Get('status')
  status() {
    return { ok: true };
  }

  @Post('import')
  async import(@Body() payload: any) {
    const created = await this.apiService.importData(payload);
    return { created: Array.isArray(created) ? created.length : 0, items: created };
  }

  @Post('fetch-and-store')
  async fetchAndStore(
    @Body()
    body: {
      league: string;
      season: number;
      sport?: number;
      origin?: string;
      startDate?: string;
      endDate?: string;
      seasonStatus?: string;
      isSeasonDefault?: boolean;
      sameYears?: boolean;
      scheduleType?: string;
      isLeagueDefault?: boolean;
      hasDivisions?: boolean;
      runInBackground?: boolean;
    },
  ) {
    const result = await this.apiService.fetchAndStore(
      body.league,
      body.season,
      body.sport,
      body.origin,
      body.startDate,
      body.endDate,
      body.seasonStatus,
      body.isSeasonDefault,
      body.sameYears,
      body.scheduleType,
      body.isLeagueDefault,
      body.hasDivisions,
      body.runInBackground,
    );
    return { stored: result };
  }

  @Get('transitional')
  async listTransitional(@Query('limit') limit?: string) {
    const l = limit ? Number(limit) : 100;
    const rows = await this.apiService.listTransitional(l);
    return { count: rows.length, items: rows };
  }

  @Get('transitional/:id')
  async getTransitional(@Param('id', ParseIntPipe) id: number) {
    const row = await this.apiService.getTransitional(id);
    if (!row) return { found: false };
    return { found: true, item: row };
  }

  @Get('transitional/:id/parse')
  async parseTransitional(
    @Param('id', ParseIntPipe) id: number,
    @Query('roundOverrides') roundOverridesJson?: string,
  ) {
    let roundOverrides: Record<string, number> | undefined;
    if (roundOverridesJson) {
      try { roundOverrides = JSON.parse(roundOverridesJson); } catch { /* ignore malformed input */ }
    }
    const parsed = await this.apiService.parseTransitional(id, roundOverrides) as any;
    if (!parsed || !parsed.found) {
      const reason = parsed?.reason ?? 'parse_failed';
      const error = parsed?.error ?? parsed?.details?.message ?? null;
      const details = parsed?.details ?? null;
      return { found: false, reason, error, details };
    }
    return { found: true, columns: parsed.columns, rows: parsed.rows, isSubsequentLoad: !!parsed.isSubsequentLoad };
  }

  @Get('transitional/:id/structured')
  async structuredTransitional(@Param('id', ParseIntPipe) id: number) {
    const res = await this.apiService.extractStructuredFromTransitional(id);
    if (!res || !res.found) return { found: false };
    return { found: true, firstRow: res.firstRow, matches: res.matches };
  }

  @Get('transitional/:id/round-review')
  async getRoundReview(@Param('id', ParseIntPipe) id: number) {
    const review = await this.apiService.getRoundReview(id);
    return { found: !!review, item: review };
  }

  @Patch('transitional/:id/round-review')
  async patchRoundReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { overrides?: Record<string, number> },
  ) {
    const review = await this.apiService.saveRoundReview(id, body?.overrides ?? {});
    return { success: true, item: review };
  }

  @Delete('transitional/:id/round-review')
  async deleteRoundReview(@Param('id', ParseIntPipe) id: number) {
    const result = await this.apiService.deleteRoundReview(id);
    return { success: !!result?.deleted };
  }

  @Post('transitional/:id/apply-first-row')
  async applyFirstRow(@Param('id', ParseIntPipe) id: number, @Body() body: { sportId?: number }) {
    const result = await this.apiService.applyFirstRowToApp(id, { sportId: body?.sportId });
    return result;
  }

  @Post('transitional/:id/apply-all-rows')
  async applyAllRows(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { sportId?: number; dryRun?: boolean; roundOverrides?: Record<string, number> },
  ) {
    const result = await this.apiService.applyAllRowsToApp(id, { sportId: body?.sportId, dryRun: !!body?.dryRun, roundOverrides: body?.roundOverrides });
    return result;
  }

  @Post('transitional/:id/load')
  async loadTransitional(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { dryRun?: boolean; targetTable?: string; mapping?: Record<string, string> },
  ) {
    const result = await this.apiService.applyTransitional(id, {
      dryRun: !!body?.dryRun,
      targetTable: body?.targetTable,
      mapping: body?.mapping,
    });
    return { result };
  }

  @Delete('transitional/:id')
  async deleteTransitional(@Param('id', ParseIntPipe) id: number) {
    const res = await this.apiService.deleteTransitional(id);
    if (!res || !res.deleted) throw new NotFoundException('Transitional row not found');
    return { success: true, id: res.id };
  }

  @Patch('transitional/:id')
  async patchTransitional(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    const res = await this.apiService.updateTransitional(id, body);
    if (!res || !res.updated) throw new NotFoundException('Transitional row not found');
    return { success: true, id: res.id, status: res.status };
  }

  @Get('target-columns')
  async getTargetColumns(@Query('table') table?: string) {
    if (!table) return { columns: [] };
    const cols = await this.apiService.getTableColumns(table);
    return { columns: cols };
  }
}
