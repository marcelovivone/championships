import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';
import { matchEvents, matches } from '../db/schema';
import { CreateMatchEventDto, UpdateMatchEventDto } from '../common/dtos';

@Injectable()
export class MatchEventsService {
  constructor(
    @Inject('DRIZZLE')
    private db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Get all match events
   */
  async findAll() {
    try {
      return await this.db.select().from(matchEvents);
    } catch (error) {
      throw new BadRequestException('Failed to fetch match events');
    }
  }

  /**
   * Get match event by ID
   */
  async findOne(id: number) {
    try {
      const event = await this.db
        .select()
        .from(matchEvents)
        .where(eq(matchEvents.id, id))
        .limit(1);

      if (!event || event.length === 0) {
        throw new NotFoundException(`Match event with ID ${id} not found`);
      }

      return event[0];
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch match event');
    }
  }

  /**
   * Get events by match
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
        .from(matchEvents)
        .where(eq(matchEvents.matchId, matchId));
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch events by match');
    }
  }

  /**
   * Create new match event (goal, card, substitution, etc.)
   */
  async create(createEventDto: CreateMatchEventDto) {
    try {
      // Verify match exists
      const match = await this.db
        .select()
        .from(matches)
        .where(eq(matches.id, createEventDto.matchId))
        .limit(1);

      if (!match || match.length === 0) {
        throw new BadRequestException(`Match with ID ${createEventDto.matchId} not found`);
      }

      const result = await this.db
        .insert(matchEvents)
        .values(createEventDto)
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to create match event');
    }
  }

  /**
   * Update match event
   */
  async update(id: number, updateEventDto: UpdateMatchEventDto) {
    try {
      // Verify event exists
      await this.findOne(id);

      const result = await this.db
        .update(matchEvents)
        .set(updateEventDto)
        .where(eq(matchEvents.id, id))
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException)
        throw error;
      throw new BadRequestException('Failed to update match event');
    }
  }

  /**
   * Delete match event
   */
  async remove(id: number) {
    try {
      // Verify event exists
      await this.findOne(id);

      const result = await this.db
        .delete(matchEvents)
        .where(eq(matchEvents.id, id))
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to delete match event');
    }
  }
}