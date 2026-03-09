import { Controller, Post, Body, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
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
  async fetchAndStore(@Body() body: { league: number; season: number; sport?: number }) {
    const result = await this.apiService.fetchAndStore(body.league, body.season, body.sport);
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
  async parseTransitional(@Param('id', ParseIntPipe) id: number) {
    const parsed = await this.apiService.parseTransitional(id);
    if (!parsed || !parsed.found) {
        return { found: false };
    }
    // console.log('Flattened rows:', parsed.rows);
    // console.log('Columns:', parsed.columns);
    return { found: true, columns: parsed.columns, rows: parsed.rows };
  }

  @Get('transitional/:id/structured')
  async structuredTransitional(@Param('id', ParseIntPipe) id: number) {
    const res = await this.apiService.extractStructuredFromTransitional(id);
    if (!res || !res.found) return { found: false };
    return { found: true, firstRow: res.firstRow, matches: res.matches };
  }

  @Post('transitional/:id/apply-first-row')
  async applyFirstRow(@Param('id', ParseIntPipe) id: number, @Body() body: { sportId?: number }) {
    const result = await this.apiService.applyFirstRowToApp(id, { sportId: body?.sportId });
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

  @Get('target-columns')
  async getTargetColumns(@Query('table') table?: string) {
    if (!table) return { columns: [] };
    const cols = await this.apiService.getTableColumns(table);
    return { columns: cols };
  }
}
