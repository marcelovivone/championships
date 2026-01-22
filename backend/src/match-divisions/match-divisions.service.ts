import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';
import { matchDivisions, matches } from '../db/schema';
import { CreateMatchDivisionDto, UpdateMatchDivisionDto } from '../common/dtos';

@Injectable()
export class MatchDivisionsService {
  constructor(
    @Inject('DRIZZLE')
    private db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Get all match divisions
   */
  async findAll() {
    try {
      return await this.db.select().from(matchDivisions);
    } catch (error) {
      throw new BadRequestException('Failed to fetch match divisions');
    }
  }

  /**
   * Get match division by ID
   */
  async findOne(id: number) {
    try {
      const division = await this.db
        .select()
        .from(matchDivisions)
        .where(eq(matchDivisions.id, id))
        .limit(1);

      if (!division || division.length === 0) {
        throw new NotFoundException(`Match division with ID ${id} not found`);
      }

      return division[0];
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch match division');
    }
  }

  /**
   * Get divisions by match
   */
  async findByMatch(matchId: number) {
    try {
      // Verify match exists
      const match = await this.db
        .select()
        .from(matches)
        .where(eq(matches.id, matchId))
        .limit(1);

      if (!match || match.length === 0) {
        throw new NotFoundException(`Match with ID ${matchId} not found`);
      }

      return await this.db
        .select()
        .from(matchDivisions)
        .where(eq(matchDivisions.matchId, matchId));
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch divisions by match');
    }
  }

  /**
   * Create new match division (Period, Quarter, Set, etc.)
   */
  async create(createDivisionDto: CreateMatchDivisionDto) {
    try {
      // Verify match exists
      const match = await this.db
        .select()
        .from(matches)
        .where(eq(matches.id, createDivisionDto.matchId))
        .limit(1);

      if (!match || match.length === 0) {
        throw new BadRequestException(`Match with ID ${createDivisionDto.matchId} not found`);
      }

      const result = await this.db
        .insert(matchDivisions)
        .values(createDivisionDto)
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to create match division');
    }
  }

  /**
   * Update match division
   */
  async update(id: number, updateDivisionDto: UpdateMatchDivisionDto) {
    try {
      // Verify division exists
      await this.findOne(id);

      // If updating match, verify it exists
      if (updateDivisionDto.matchId) {
        const match = await this.db
          .select()
          .from(matches)
          .where(eq(matches.id, updateDivisionDto.matchId))
          .limit(1);

        if (!match || match.length === 0) {
          throw new BadRequestException(`Match with ID ${updateDivisionDto.matchId} not found`);
        }
      }

      const result = await this.db
        .update(matchDivisions)
        .set(updateDivisionDto)
        .where(eq(matchDivisions.id, id))
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException)
        throw error;
      throw new BadRequestException('Failed to update match division');
    }
  }

  /**
   * Delete match division
   */
  async remove(id: number) {
    try {
      // Verify division exists
      await this.findOne(id);

      // Note: Match events are not directly linked to divisions yet
      // When that relationship is added, we should check here

      const result = await this.db
        .delete(matchDivisions)
        .where(eq(matchDivisions.id, id))
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException)
        throw error;
      throw new BadRequestException('Failed to delete match division');
    }
  }
}