import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, sql, asc, desc, and, or, ilike } from 'drizzle-orm';
import * as schema from '../db/schema';
import { sports } from '../db/schema';
import { CreateSportDto, PaginationDto, UpdateSportDto, FilteringDto } from '../common/dtos';

@Injectable()
export class SportsService {
  constructor(
    @Inject('DRIZZLE')
    private db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Get all sports with pagination, sorting, and filtering
   */
  async findAll(paginationDto: PaginationDto, filteringDto: FilteringDto = {}) {
    const { page = 1, limit = 10 } = paginationDto;
    const { sortBy, sortOrder, search } = filteringDto;
    const offset = (page - 1) * limit;

    const sortableColumns = ['name', 'reducedName', 'type', 'divisionType', 'minMatchDivisionNumber', 'maxMatchDivisionNumber', 'divisionTime', 'scoreType', 'hasOvertime', 'hasPenalties', 'flgDefault'];
    const orderBy = sortableColumns.includes(sortBy) ? sortBy : 'name';
    const order = sortOrder === 'desc' ? desc : asc;

    // Build WHERE clause
    const whereConditions = [];
    if (search) {
      whereConditions.push(
        or(
          ilike(sports.name, `%${search}%`),
          ilike(sports.reducedName, `%${search}%`),
          ilike(sports.type, `%${search}%`),
        ),
      );
    }
    const finalWhere = and(...whereConditions);

    try {
      const query = this.db.select().from(sports).where(finalWhere);

      // Get total count matching the filter
      const totalResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(sports)
        .where(finalWhere);
      
      const total = Number(totalResult[0].count);
      
      // Get paginated and sorted data
      const data = await query
        .orderBy(order(sports[orderBy]))
        .limit(limit)
        .offset(offset);

      return { data, total, page, limit };
    } catch (error) {
      console.error('Error fetching sports:', error);
      throw new BadRequestException('Failed to fetch paginated and filtered sports');
    }
  }

  /**
   * Get sport by ID
   */
  async findOne(id: number) {
    try {
      const sport = await this.db
        .select()
        .from(sports)
        .where(eq(sports.id, id))
        .limit(1);

      if (!sport || sport.length === 0) {
        throw new NotFoundException(`Sport with ID ${id} not found`);
      }

      return sport[0];
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch sport');
    }
  }

  /**
   * Get sports by type (collective or individual)
   */
  async findByType(type: 'collective' | 'individual') {
    try {
      return await this.db
        .select()
        .from(sports)
        .where(eq(sports.type, type));
    } catch (error) {
      throw new BadRequestException('Failed to fetch sports by type');
    }
  }

  /**
   * Create new sport
   */
  async create(createSportDto: CreateSportDto) {
    try {
      // Validate that the sport name is unique
      const existing = await this.db
        .select()
        .from(sports)
        .where(eq(sports.name, createSportDto.name))
        .limit(1);

      if (existing && existing.length > 0) {
        throw new BadRequestException(`Sport "${createSportDto.name}" already exists`);
      }

      // If setting this sport as default, unset all other defaults
      if (createSportDto.flgDefault) {
        await this.db
          .update(sports)
          .set({ flgDefault: false })
          .where(eq(sports.flgDefault, true));
      }

      const result = await this.db
        .insert(sports)
        .values(createSportDto)
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to create sport');
    }
  }

  /**
   * Update sport
   */
  async update(id: number, updateSportDto: UpdateSportDto) {
    try {
      // Verify sport exists
      await this.findOne(id);

      // If updating name, check uniqueness
      if (updateSportDto.name) {
        const existing = await this.db
          .select()
          .from(sports)
          .where(eq(sports.name, updateSportDto.name))
          .limit(1);

        if (existing && existing.length > 0 && existing[0].id !== id) {
          throw new BadRequestException(`Sport "${updateSportDto.name}" already exists`);
        }
      }

      // If setting this sport as default, unset all other defaults
      if (updateSportDto.flgDefault === true) {
        await this.db
          .update(sports)
          .set({ flgDefault: false })
          .where(eq(sports.flgDefault, true));
      }

      const result = await this.db
        .update(sports)
        .set(updateSportDto)
        .where(eq(sports.id, id))
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException)
        throw error;
      throw new BadRequestException('Failed to update sport');
    }
  }

  /**
   * Delete sport
   * Note: Validates that no leagues use this sport
   */
  async remove(id: number) {
    try {
      // Verify sport exists
      await this.findOne(id);

      // Check if any leagues use this sport
      const leagues = await this.db
        .select()
        .from(schema.leagues)
        .where(eq(schema.leagues.sportId, id))
        .limit(1);

      if (leagues && leagues.length > 0) {
        throw new BadRequestException(
          'Cannot delete sport. Leagues are using this sport.',
        );
      }

      const result = await this.db
        .delete(sports)
        .where(eq(sports.id, id))
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException)
        throw error;
      throw new BadRequestException('Failed to delete sport');
    }
  }
}