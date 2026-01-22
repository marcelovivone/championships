import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';
import { groups, phases, rounds } from '../db/schema';
import { CreateGroupDto, UpdateGroupDto } from '../common/dtos';

@Injectable()
export class GroupsService {
  constructor(
    @Inject('DRIZZLE')
    private db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Get all groups
   */
  async findAll() {
    try {
      return await this.db.select().from(groups);
    } catch (error) {
      throw new BadRequestException('Failed to fetch groups');
    }
  }

  /**
   * Get group by ID
   */
  async findOne(id: number) {
    try {
      const group = await this.db
        .select()
        .from(groups)
        .where(eq(groups.id, id))
        .limit(1);

      if (!group || group.length === 0) {
        throw new NotFoundException(`Group with ID ${id} not found`);
      }

      return group[0];
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch group');
    }
  }

  /**
   * Get groups by phase
   */
  async findByPhase(phaseId: number) {
    try {
      // Verify phase exists
      const phase = await this.db
        .select()
        .from(phases)
        .where(eq(phases.id, phaseId))
        .limit(1);

      if (!phase || phase.length === 0) {
        throw new NotFoundException(`Phase with ID ${phaseId} not found`);
      }

      return await this.db
        .select()
        .from(groups)
        .where(eq(groups.phaseId, phaseId));
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch groups by phase');
    }
  }

  /**
   * Groups are associated with phases, not directly with rounds
   * This method is kept for future use when groups-rounds relationship is needed
   */
  // Commented out: roundId field not in schema yet
  // async findByRound(roundId: number) { ... }

  /**
   * Create new group
   */
  async create(createGroupDto: CreateGroupDto) {
    try {
      // Verify phase exists
      const phase = await this.db
        .select()
        .from(phases)
        .where(eq(phases.id, createGroupDto.phaseId))
        .limit(1);

      if (!phase || phase.length === 0) {
        throw new BadRequestException(`Phase with ID ${createGroupDto.phaseId} not found`);
      }

      const result = await this.db
        .insert(groups)
        .values(createGroupDto)
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to create group');
    }
  }

  /**
   * Update group
   */
  async update(id: number, updateGroupDto: UpdateGroupDto) {
    try {
      // Verify group exists
      await this.findOne(id);

      // If updating phase, verify it exists
      if (updateGroupDto.phaseId) {
        const phase = await this.db
          .select()
          .from(phases)
          .where(eq(phases.id, updateGroupDto.phaseId))
          .limit(1);

        if (!phase || phase.length === 0) {
          throw new BadRequestException(`Phase with ID ${updateGroupDto.phaseId} not found`);
        }
      }

      const result = await this.db
        .update(groups)
        .set(updateGroupDto)
        .where(eq(groups.id, id))
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException)
        throw error;
      throw new BadRequestException('Failed to update group');
    }
  }

  /**
   * Delete group
   */
  async remove(id: number) {
    try {
      // Verify group exists
      await this.findOne(id);

      // Check if group has any matches
      const matches = await this.db
        .select()
        .from(schema.matches)
        .where(eq(schema.matches.groupId, id))
        .limit(1);

      if (matches && matches.length > 0) {
        throw new BadRequestException(
          'Cannot delete group. Matches are associated with this group.',
        );
      }

      // Check if group has any clubs
      const groupClubs = await this.db
        .select()
        .from(schema.groupClubs)
        .where(eq(schema.groupClubs.groupId, id))
        .limit(1);

      if (groupClubs && groupClubs.length > 0) {
        throw new BadRequestException(
          'Cannot delete group. Clubs are assigned to this group.',
        );
      }

      const result = await this.db
        .delete(groups)
        .where(eq(groups.id, id))
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException)
        throw error;
      throw new BadRequestException('Failed to delete group');
    }
  }
}