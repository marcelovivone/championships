import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { standingZones, sports, leagues, seasons } from '../db/schema';
import { eq, and, sql, asc, desc } from 'drizzle-orm';
import { CreateStandingZoneDto, UpdateStandingZoneDto } from '../common/dtos';

@Injectable()
export class StandingZonesService {
  constructor(@Inject('DRIZZLE') private db: NodePgDatabase<typeof schema>) {}

  async findAll(params: any) {
    const { sportId, leagueId, seasonId, page = 1, limit = 50, sortBy = 'startPosition', sortOrder = 'asc' } = params;
    const offset = (page - 1) * limit;

    try {
      // Build base select and apply where before pagination/sorting to keep Drizzle types correct
      let baseQuery: any = this.db.select().from(standingZones);

      const conds: any[] = [];
      if (sportId) conds.push(eq(standingZones.sportId, sportId));
      if (leagueId) conds.push(eq(standingZones.leagueId, leagueId));
      if (seasonId) conds.push(eq(standingZones.seasonId, seasonId));

      let whereCond: any = undefined;
      if (conds.length) {
        let out = conds[0];
        for (let i = 1; i < conds.length; i++) out = and(out, conds[i]);
        whereCond = out;
      }

      if (whereCond) baseQuery = baseQuery.where(whereCond);

      // Support ordering by related/display fields (season start year, sport name, league name)
      let query: any;

      const needJoinForSort = ['sportName', 'leagueName', 'seasonStart', 'seasonId'].includes(sortBy);
      if (needJoinForSort) {
        // Use SQL subselects in ORDER BY to avoid joins and ensure deterministic ordering.
        // Primary: season start year (desc/asc), secondary: sport name asc, tertiary: league original name asc
        let oq: any = baseQuery;
        if (sortBy === 'seasonStart' || sortBy === 'seasonId') {
          oq = oq.orderBy(sortOrder === 'desc'
            ? desc(sql`(select start_year from seasons where seasons.id = standing_zones.season_id)`)
            : asc(sql`(select start_year from seasons where seasons.id = standing_zones.season_id)`)
          );
          oq = oq.orderBy(asc(sql`(select name from sports where sports.id = standing_zones.sport_id)`));
          oq = oq.orderBy(asc(sql`(select original_name from leagues where leagues.id = standing_zones.league_id)`));
        } else if (sortBy === 'sportName') {
          oq = oq.orderBy(sortOrder === 'desc'
            ? desc(sql`(select name from sports where sports.id = standing_zones.sport_id)`)
            : asc(sql`(select name from sports where sports.id = standing_zones.sport_id)`)
          );
          oq = oq.orderBy(asc(sql`(select original_name from leagues where leagues.id = standing_zones.league_id)`));
          oq = oq.orderBy(asc(sql`(select start_year from seasons where seasons.id = standing_zones.season_id)`));
        } else if (sortBy === 'leagueName') {
          oq = oq.orderBy(sortOrder === 'desc'
            ? desc(sql`(select original_name from leagues where leagues.id = standing_zones.league_id)`)
            : asc(sql`(select original_name from leagues where leagues.id = standing_zones.league_id)`)
          );
          oq = oq.orderBy(asc(sql`(select name from sports where sports.id = standing_zones.sport_id)`));
          oq = oq.orderBy(asc(sql`(select start_year from seasons where seasons.id = standing_zones.season_id)`));
        }

        query = oq.limit(limit).offset(offset);
      } else if (sortBy === 'startPosition' || sortBy === 'range') {
        // Chain orderBy calls instead of passing an array to avoid Drizzle producing
        // a parenthesized ORDER BY expression which breaks Postgres.
        let oq: any = baseQuery;
        oq = oq.orderBy(sortOrder === 'desc' ? desc(standingZones.startPosition) : asc(standingZones.startPosition));
        oq = oq.orderBy(asc(standingZones.endPosition));
        query = oq.limit(limit).offset(offset);
      } else if (sortBy === 'colorHex') {
        query = baseQuery.limit(limit).offset(offset).orderBy(sortOrder === 'desc' ? desc(standingZones.colorHex) : asc(standingZones.colorHex));
      } else {
        const col = (standingZones as any)[sortBy] || standingZones.startPosition;
        query = baseQuery.limit(limit).offset(offset).orderBy(sortOrder === 'desc' ? desc(col) : asc(col));
      }

      let data: any = await query;

      // Data returned by baseQuery already contains the standing_zones columns in expected shape.

      // Build total count
      let totalResult;
      if (whereCond) {
        totalResult = await this.db.select({ count: sql`count(*)` }).from(standingZones).where(whereCond);
      } else {
        totalResult = await this.db.select({ count: sql`count(*)` }).from(standingZones);
      }

      const total = totalResult && totalResult[0] ? Number((totalResult[0] as any).count || 0) : data.length;
      return { data, total };
    } catch (error) {
      console.error('Error in StandingZonesService.findAll:', error);
      const msg = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(`Failed to fetch standing zones: ${msg || 'unknown'}`);
    }
  }

  async findOne(id: number) {
    try {
      const rows = await this.db.select().from(standingZones).where(eq(standingZones.id, id)).limit(1);
      if (!rows || rows.length === 0) throw new NotFoundException(`Standing zone ${id} not found`);
      return rows[0];
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch standing zone');
    }
  }

  async create(dto: CreateStandingZoneDto) {
    // Basic validations
    if (dto.startPosition < 1 || dto.endPosition < 1) {
      throw new BadRequestException('Positions must be >= 1');
    }
    if (dto.endPosition < dto.startPosition) {
      throw new BadRequestException('End Position must be equal or greater than Start Position');
    }

    // Validate sport and league exist
    const sport = await this.db.select().from(sports).where(eq(sports.id, dto.sportId)).limit(1);
    if (!sport || sport.length === 0) throw new BadRequestException(`Sport ${dto.sportId} not found`);

    const league = await this.db.select().from(leagues).where(eq(leagues.id, dto.leagueId)).limit(1);
    if (!league || league.length === 0) throw new BadRequestException(`League ${dto.leagueId} not found`);

    if (dto.seasonId) {
      const season = await this.db.select().from(seasons).where(eq(seasons.id, dto.seasonId)).limit(1);
      if (!season || season.length === 0) throw new BadRequestException(`Season ${dto.seasonId} not found`);
    }

    // Validate typeOfStanding
    const allowedTypes = ['All', 'Combined', 'Group'];
    if (dto.typeOfStanding && !allowedTypes.includes(dto.typeOfStanding)) {
      throw new BadRequestException(`Invalid typeOfStanding. Allowed: ${allowedTypes.join(', ')}`);
    }

    try {
      const res = await this.db.insert(standingZones).values(dto).returning();
      return this.findOne(res[0].id);
    } catch (error) {
      throw new BadRequestException('Failed to create standing zone');
    }
  }

  async update(id: number, dto: UpdateStandingZoneDto) {
    const existing = await this.findOne(id);

    if (dto.startPosition !== undefined && dto.startPosition < 1) throw new BadRequestException('Positions must be >= 1');
    if (dto.endPosition !== undefined && dto.endPosition < 1) throw new BadRequestException('Positions must be >= 1');
    if (dto.startPosition !== undefined && dto.endPosition !== undefined && dto.endPosition < dto.startPosition) throw new BadRequestException('End Position must be equal or greater than Start Position');

    if (dto.sportId) {
      const sport = await this.db.select().from(sports).where(eq(sports.id, dto.sportId)).limit(1);
      if (!sport || sport.length === 0) throw new BadRequestException(`Sport ${dto.sportId} not found`);
    }
    if (dto.leagueId) {
      const league = await this.db.select().from(leagues).where(eq(leagues.id, dto.leagueId)).limit(1);
      if (!league || league.length === 0) throw new BadRequestException(`League ${dto.leagueId} not found`);
    }
    if (dto.seasonId) {
      const season = await this.db.select().from(seasons).where(eq(seasons.id, dto.seasonId)).limit(1);
      if (!season || season.length === 0) throw new BadRequestException(`Season ${dto.seasonId} not found`);
    }

    // Validate typeOfStanding
    const allowedTypes = ['All', 'Combined', 'Group'];
    if (dto.typeOfStanding && !allowedTypes.includes(dto.typeOfStanding)) {
      throw new BadRequestException(`Invalid typeOfStanding. Allowed: ${allowedTypes.join(', ')}`);
    }

    try {
      await this.db.update(standingZones).set(dto as any).where(eq(standingZones.id, id));
      return this.findOne(id);
    } catch (error) {
      throw new BadRequestException('Failed to update standing zone');
    }
  }

  async remove(id: number) {
    // No complex dependency checks by default
    await this.findOne(id);
    try {
      await this.db.delete(standingZones).where(eq(standingZones.id, id));
    } catch (error) {
      throw new BadRequestException('Failed to delete standing zone');
    }
  }
}
