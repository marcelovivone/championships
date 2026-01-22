import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, sql } from 'drizzle-orm';
import * as schema from '../db/schema';
import { leagues, sports } from '../db/schema';
import { CreateLeagueDto, PaginationDto, UpdateLeagueDto } from '../common/dtos';

@Injectable()
export class LeaguesService {
  constructor(
    @Inject('DRIZZLE')
    private db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Get all leagues
   */
  async findAll(paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const offset = (page - 1) * limit;

    try {
      const data = await this.db
        .select()
        .from(leagues)
        .orderBy(leagues.originalName)
        .limit(limit)
        .offset(offset);

      const totalResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(leagues);
      const total = Number(totalResult[0].count);
      return { data, total };
    } catch (error) {
      throw new BadRequestException('Failed to fetch paginated leagues');
    }
  }

  /**
   * Get league by ID
   */
  async findOne(id: number) {
    try {
      const league = await this.db
        .select()
        .from(leagues)
        .where(eq(leagues.id, id))
        .limit(1);

      if (!league || league.length === 0) {
        throw new NotFoundException(`League with ID ${id} not found`);
      }

      return league[0];
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch league');
    }
  }

  /**
   * Get leagues by sport
   */
  async findBySport(sportId: number, paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const offset = (page - 1) * limit;

    try {
      // Verify sport exists
      const sport = await this.db
        .select()
        .from(sports)
        .where(eq(sports.id, sportId))
        .limit(1);

      if (!sport || sport.length === 0) {
        throw new NotFoundException(`Sport with ID ${sportId} not found`);
      }

      const data = await this.db
        .select()
        .from(leagues)
        .where(eq(leagues.sportId, sportId))
        .orderBy(leagues.originalName)
        .limit(limit)
        .offset(offset);

      const totalResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(leagues)
        .where(eq(leagues.sportId, sportId));
      const total = Number(totalResult[0].count);
      return { data, total };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch paginated leagues by sport');
    }
  }

  /**
   * Create new league
   */
  async create(createLeagueDto: CreateLeagueDto) {
    try {
      // Verify sport exists
      const sport = await this.db
        .select()
        .from(sports)
        .where(eq(sports.id, createLeagueDto.sportId))
        .limit(1);

      if (!sport || sport.length === 0) {
        throw new BadRequestException(`Sport with ID ${createLeagueDto.sportId} not found`);
      }

      const result = await this.db
        .insert(leagues)
        .values(createLeagueDto)
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to create league');
    }
  }

  /**
   * Update league
   */
  async update(id: number, updateLeagueDto: UpdateLeagueDto) {
    try {
      // Verify league exists
      await this.findOne(id);

      // If updating sport, verify it exists
      if (updateLeagueDto.sportId) {
        const sport = await this.db
          .select()
          .from(sports)
          .where(eq(sports.id, updateLeagueDto.sportId))
          .limit(1);

        if (!sport || sport.length === 0) {
          throw new BadRequestException(`Sport with ID ${updateLeagueDto.sportId} not found`);
        }
      }

      const result = await this.db
        .update(leagues)
        .set(updateLeagueDto)
        .where(eq(leagues.id, id))
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException)
        throw error;
      throw new BadRequestException('Failed to update league');
    }
  }

  /**
   * Delete league
   */
  async remove(id: number) {
    try {
      // Verify league exists
      await this.findOne(id);

      // Check if league has any seasons
      const seasons = await this.db
        .select()
        .from(schema.seasons)
        .where(eq(schema.seasons.leagueId, id))
        .limit(1);

      if (seasons && seasons.length > 0) {
        throw new BadRequestException('Cannot delete league. League has associated seasons.');
      }

      const result = await this.db
        .delete(leagues)
        .where(eq(leagues.id, id))
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException)
        throw error;
      throw new BadRequestException('Failed to delete league');
    }
  }

  /**
   * Add external link to league (e.g., official website, social media)
   * Note: The current schema supports simple league links with label and URL
   * For league-to-league relationships, a future enhancement is needed
   */
  async addLink(leagueId: number, label: string, url: string) {
    try {
      // Verify league exists
      await this.findOne(leagueId);

      const result = await this.db
        .insert(schema.leagueLinks)
        .values({
          leagueId: leagueId,
          label: label,
          url: url,
        })
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException)
        throw error;
      throw new BadRequestException('Failed to add league link');
    }
  }

  /**
   * Remove link from league
   */
  async removeLink(leagueId: number, linkId: number) {
    try {
      const result = await this.db
        .delete(schema.leagueLinks)
        .where(
          and(
            eq(schema.leagueLinks.leagueId, leagueId),
            eq(schema.leagueLinks.id, linkId),
          ),
        )
        .returning();

      if (!result || result.length === 0) {
        throw new NotFoundException('Link not found');
      }

      return result[0];
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to remove league link');
    }
  }
}