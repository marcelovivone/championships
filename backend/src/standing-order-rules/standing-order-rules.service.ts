import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { standingOrderRules, sports, leagues } from '../db/schema';
import { eq, and, sql, asc, desc, isNull } from 'drizzle-orm';
import { CreateStandingOrderRuleDto, UpdateStandingOrderRuleDto } from '../common/dtos';

@Injectable()
export class StandingOrderRulesService {
  constructor(@Inject('DRIZZLE') private db: NodePgDatabase<typeof schema>) {}

  async findAll(params: any) {
    const { sportId, leagueId, page = 1, limit = 50, sortBy = 'sortOrder', sortOrder = 'asc' } = params;
    const offset = (page - 1) * limit;

    const conds: any[] = [];
    if (sportId) conds.push(eq(standingOrderRules.sportId, sportId));
    if (leagueId === 'null' || leagueId === 'sport-default') {
      conds.push(isNull(standingOrderRules.leagueId));
    } else if (leagueId) {
      conds.push(eq(standingOrderRules.leagueId, Number(leagueId)));
    }

    let whereCond: any = undefined;
    if (conds.length) {
      whereCond = conds[0];
      for (let i = 1; i < conds.length; i++) whereCond = and(whereCond, conds[i]);
    }

    let query: any = this.db.select().from(standingOrderRules);
    if (whereCond) query = query.where(whereCond);

    // Sorting
    const sortCol = (standingOrderRules as any)[sortBy] || standingOrderRules.sortOrder;
    query = query.orderBy(sortOrder === 'desc' ? desc(sortCol) : asc(sortCol));
    query = query.limit(limit).offset(offset);

    const data = await query;

    let totalResult;
    if (whereCond) {
      totalResult = await this.db.select({ count: sql`count(*)` }).from(standingOrderRules).where(whereCond);
    } else {
      totalResult = await this.db.select({ count: sql`count(*)` }).from(standingOrderRules);
    }
    const total = totalResult?.[0] ? Number((totalResult[0] as any).count || 0) : data.length;

    return { data, total };
  }

  async findOne(id: number) {
    const rows = await this.db.select().from(standingOrderRules).where(eq(standingOrderRules.id, id)).limit(1);
    if (!rows?.length) throw new NotFoundException(`Standing order rule ${id} not found`);
    return rows[0];
  }

  /**
   * Resolve the effective tiebreaker rules for a given league and season year.
   * 1. League-level rules matching the year range
   * 2. Sport-level defaults matching the year range
   * 3. Empty array (caller uses legacy fallback)
   */
  async resolveForLeagueAndSeason(leagueId: number, sportId: number, seasonStartYear: number) {
    // Try league-level first
    const leagueRules = await this.db
      .select()
      .from(standingOrderRules)
      .where(
        and(
          eq(standingOrderRules.sportId, sportId),
          eq(standingOrderRules.leagueId, leagueId),
          sql`(${standingOrderRules.startYear} IS NULL OR ${standingOrderRules.startYear} <= ${seasonStartYear})`,
          sql`(${standingOrderRules.endYear} IS NULL OR ${standingOrderRules.endYear} >= ${seasonStartYear})`,
        ),
      )
      .orderBy(asc(standingOrderRules.sortOrder));

    if (leagueRules.length > 0) return leagueRules;

    // Fall back to sport-level defaults
    const sportRules = await this.db
      .select()
      .from(standingOrderRules)
      .where(
        and(
          eq(standingOrderRules.sportId, sportId),
          isNull(standingOrderRules.leagueId),
          sql`(${standingOrderRules.startYear} IS NULL OR ${standingOrderRules.startYear} <= ${seasonStartYear})`,
          sql`(${standingOrderRules.endYear} IS NULL OR ${standingOrderRules.endYear} >= ${seasonStartYear})`,
        ),
      )
      .orderBy(asc(standingOrderRules.sortOrder));

    return sportRules;
  }

  async create(dto: CreateStandingOrderRuleDto) {
    // Validate sport exists
    const sport = await this.db.select().from(sports).where(eq(sports.id, dto.sportId)).limit(1);
    if (!sport?.length) throw new BadRequestException(`Sport ${dto.sportId} not found`);

    // Validate league if provided
    if (dto.leagueId) {
      const league = await this.db.select().from(leagues).where(eq(leagues.id, dto.leagueId)).limit(1);
      if (!league?.length) throw new BadRequestException(`League ${dto.leagueId} not found`);
    }

    const values: any = {
      sportId: dto.sportId,
      leagueId: dto.leagueId || null,
      startYear: dto.startYear ?? null,
      endYear: dto.endYear ?? null,
      sortOrder: dto.sortOrder,
      criterion: dto.criterion,
      direction: dto.direction || 'DESC',
    };

    const res = await this.db.insert(standingOrderRules).values(values).returning();
    return res[0];
  }

  async update(id: number, dto: UpdateStandingOrderRuleDto) {
    await this.findOne(id);

    if (dto.sportId) {
      const sport = await this.db.select().from(sports).where(eq(sports.id, dto.sportId)).limit(1);
      if (!sport?.length) throw new BadRequestException(`Sport ${dto.sportId} not found`);
    }
    if (dto.leagueId) {
      const league = await this.db.select().from(leagues).where(eq(leagues.id, dto.leagueId)).limit(1);
      if (!league?.length) throw new BadRequestException(`League ${dto.leagueId} not found`);
    }

    const values: any = {};
    if (dto.sportId !== undefined) values.sportId = dto.sportId;
    if (dto.leagueId !== undefined) values.leagueId = dto.leagueId || null;
    if (dto.startYear !== undefined) values.startYear = dto.startYear ?? null;
    if (dto.endYear !== undefined) values.endYear = dto.endYear ?? null;
    if (dto.sortOrder !== undefined) values.sortOrder = dto.sortOrder;
    if (dto.criterion !== undefined) values.criterion = dto.criterion;
    if (dto.direction !== undefined) values.direction = dto.direction;

    await this.db.update(standingOrderRules).set(values).where(eq(standingOrderRules.id, id));
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.db.delete(standingOrderRules).where(eq(standingOrderRules.id, id));
  }

  /**
   * Re-sequence sort_order values back to 100, 200, 300... for a given scope.
   */
  async resequence(sportId: number, leagueId: number | null, startYear: number | null) {
    const conds: any[] = [eq(standingOrderRules.sportId, sportId)];
    if (leagueId) {
      conds.push(eq(standingOrderRules.leagueId, leagueId));
    } else {
      conds.push(isNull(standingOrderRules.leagueId));
    }
    if (startYear !== null && startYear !== undefined) {
      conds.push(eq(standingOrderRules.startYear, startYear));
    } else {
      conds.push(isNull(standingOrderRules.startYear));
    }

    let whereCond: any = conds[0];
    for (let i = 1; i < conds.length; i++) whereCond = and(whereCond, conds[i]);

    const rules = await this.db
      .select()
      .from(standingOrderRules)
      .where(whereCond)
      .orderBy(asc(standingOrderRules.sortOrder));

    for (let i = 0; i < rules.length; i++) {
      const newOrder = (i + 1) * 100;
      if (rules[i].sortOrder !== newOrder) {
        await this.db
          .update(standingOrderRules)
          .set({ sortOrder: newOrder })
          .where(eq(standingOrderRules.id, rules[i].id));
      }
    }

    return { resequenced: rules.length };
  }
}
