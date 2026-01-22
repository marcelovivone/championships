import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';
import { phases, seasons } from '../db/schema';
import { CreatePhaseDto, UpdatePhaseDto } from '../common/dtos';

@Injectable()
export class PhasesService {
  constructor(
    @Inject('DRIZZLE')
    private db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Get all phases
   */
  async findAll() {
    try {
      return await this.db.select().from(phases);
    } catch (error) {
      throw new BadRequestException('Failed to fetch phases');
    }
  }

  /**
   * Get phase by ID
   */
  async findOne(id: number) {
    try {
      const phase = await this.db
        .select()
        .from(phases)
        .where(eq(phases.id, id))
        .limit(1);

      if (!phase || phase.length === 0) {
        throw new NotFoundException(`Phase with ID ${id} not found`);
      }

      return phase[0];
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch phase');
    }
  }

  /**
   * Get phases by season
   */
  async findBySeason(seasonId: number) {
    try {
      // Verify season exists
      const season = await this.db
        .select()
        .from(seasons)
        .where(eq(seasons.id, seasonId))
        .limit(1);

      if (!season || season.length === 0) {
        throw new NotFoundException(`Season with ID ${seasonId} not found`);
      }

      return await this.db
        .select()
        .from(phases)
        .where(eq(phases.seasonId, seasonId));
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch phases by season');
    }
  }

  /**
   * Create new phase
   */
  async create(createPhaseDto: CreatePhaseDto) {
    try {
      // Verify season exists
      const season = await this.db
        .select()
        .from(seasons)
        .where(eq(seasons.id, createPhaseDto.seasonId))
        .limit(1);

      if (!season || season.length === 0) {
        throw new BadRequestException(`Season with ID ${createPhaseDto.seasonId} not found`);
      }

      const result = await this.db
        .insert(phases)
        .values(createPhaseDto)
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to create phase');
    }
  }

  /**
   * Update phase
   */
  async update(id: number, updatePhaseDto: UpdatePhaseDto) {
    try {
      // Verify phase exists
      await this.findOne(id);

      // If updating season, verify it exists
      if (updatePhaseDto.seasonId) {
        const season = await this.db
          .select()
          .from(seasons)
          .where(eq(seasons.id, updatePhaseDto.seasonId))
          .limit(1);

        if (!season || season.length === 0) {
          throw new BadRequestException(`Season with ID ${updatePhaseDto.seasonId} not found`);
        }
      }

      const result = await this.db
        .update(phases)
        .set(updatePhaseDto)
        .where(eq(phases.id, id))
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException)
        throw error;
      throw new BadRequestException('Failed to update phase');
    }
  }

  /**
   * Delete phase
   */
  async remove(id: number) {
    try {
      // Verify phase exists
      await this.findOne(id);

      // Check if phase has any groups or rounds
      const groups = await this.db
        .select()
        .from(schema.groups)
        .where(eq(schema.groups.phaseId, id))
        .limit(1);

      if (groups && groups.length > 0) {
        throw new BadRequestException(
          'Cannot delete phase. Groups are associated with this phase.',
        );
      }

      const result = await this.db
        .delete(phases)
        .where(eq(phases.id, id))
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException)
        throw error;
      throw new BadRequestException('Failed to delete phase');
    }
  }
}