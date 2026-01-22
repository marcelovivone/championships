import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../db/schema';
import { sports } from '../db/schema';
import { CreateSportDto, PaginationDto, UpdateSportDto } from '../common/dtos';

@Injectable()
export class SportsService {
  constructor(
    @Inject('DRIZZLE')
    private db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Get all sports
   */
  async findAll(paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const offset = (page - 1) * limit;

    try {
      const data = await this.db
        .select()
        .from(sports)
        .orderBy(sports.name)
        .limit(limit)
        .offset(offset);

      const totalResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(sports);
      const total = Number(totalResult[0].count);
      return { data, total };
    } catch (error) {
      throw new BadRequestException('Failed to fetch paginated sports');
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