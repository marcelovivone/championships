import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';
import { groups, seasons, sports, leagues } from '../db/schema';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

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
      return await this.db
        .select({
          id: groups.id,
          name: groups.name,
          seasonId: groups.seasonId,
          sportId: groups.sportId,
          leagueId: groups.leagueId,
          createdAt: groups.createdAt,
          season: seasons,
          sport: sports,
          league: leagues,
        })
        .from(groups)
        .leftJoin(seasons, eq(groups.seasonId, seasons.id))
        .leftJoin(sports, eq(groups.sportId, sports.id))
        .leftJoin(leagues, eq(groups.leagueId, leagues.id));
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
   * Get groups by season
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
        .from(groups)
        .where(eq(groups.seasonId, seasonId));
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch groups by season');
    }
  }

  /**
   * Create new group
   */
  async create(createGroupDto: CreateGroupDto) {
    try {
      // Verify sport exists
      const sport = await this.db
        .select()
        .from(sports)
        .where(eq(sports.id, createGroupDto.sportId))
        .limit(1);
      if (!sport || sport.length === 0) {
        throw new BadRequestException(`Sport with ID ${createGroupDto.sportId} not found`);
      }

      // Verify league exists
      const league = await this.db
        .select()
        .from(leagues)
        .where(eq(leagues.id, createGroupDto.leagueId))
        .limit(1);
      if (!league || league.length === 0) {
        throw new BadRequestException(`League with ID ${createGroupDto.leagueId} not found`);
      }
      
      // Verify season exists
      const season = await this.db
        .select()
        .from(seasons)
        .where(eq(seasons.id, createGroupDto.seasonId))
        .limit(1);

      if (!season || season.length === 0) {
        throw new BadRequestException(`Season with ID ${createGroupDto.seasonId} not found`);
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

      // If updating sport, verify it exists
      if (updateGroupDto.sportId) {
        const sport = await this.db
          .select()
          .from(sports)
          .where(eq(sports.id, updateGroupDto.sportId))
          .limit(1);
        if (!sport || sport.length === 0) {
          throw new BadRequestException(`Sport with ID ${updateGroupDto.sportId} not found`);
        }
      }

      // If updating league, verify it exists
      if (updateGroupDto.leagueId) {
        const league = await this.db
          .select()
          .from(leagues)
          .where(eq(leagues.id, updateGroupDto.leagueId))
          .limit(1);
        if (!league || league.length === 0) {
          throw new BadRequestException(`League with ID ${updateGroupDto.leagueId} not found`);
        }
      }

      // If updating season, verify it exists
      if (updateGroupDto.seasonId) {
        const season = await this.db
          .select()
          .from(seasons)
          .where(eq(seasons.id, updateGroupDto.seasonId))
          .limit(1);

        if (!season || season.length === 0) {
          throw new BadRequestException(`Season with ID ${updateGroupDto.seasonId} not found`);
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
