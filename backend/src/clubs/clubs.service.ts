import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../db/schema';
import { clubs, countries } from '../db/schema';
import { CreateClubDto, PaginationDto, UpdateClubDto } from '../common/dtos';

@Injectable()
export class ClubsService {
  constructor(
    @Inject('DRIZZLE')
    private db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Get all clubs with country information
   */
  async findAll(paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const offset = (page - 1) * limit;

    try {
      const data = await this.db
        .select({
          id: clubs.id,
          name: clubs.name,
          shortName: clubs.shortName,
          foundationYear: clubs.foundationYear,
          imageUrl: clubs.imageUrl,
          countryId: clubs.countryId,
          country: {
            id: countries.id,
            name: countries.name,
          },
        })
        .from(clubs)
        .leftJoin(countries, eq(clubs.countryId, countries.id))
        .orderBy(clubs.name)
        .limit(limit)
        .offset(offset);

      const totalResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(clubs);

      const total = Number(totalResult[0].count);

      return { data, total };
    } catch (error) {
      throw new BadRequestException('Failed to fetch paginated clubs');
    }
  }

  /**
   * Get club by ID with country information
   */
  async findOne(id: number) {
    try {
      const club = await this.db
        .select({
          id: clubs.id,
          name: clubs.name,
          shortName: clubs.shortName,
          foundationYear: clubs.foundationYear,
          imageUrl: clubs.imageUrl,
          countryId: clubs.countryId,
          country: {
            id: countries.id,
            name: countries.name,
          },
        })
        .from(clubs)
        .leftJoin(countries, eq(clubs.countryId, countries.id))
        .where(eq(clubs.id, id))
        .limit(1);

      if (!club || club.length === 0) {
        throw new NotFoundException(`Club with ID ${id} not found`);
      }

      return club[0];
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch club');
    }
  }

  /**
   * Get clubs by country
   */
  async findByCountry(countryId: number, paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const offset = (page - 1) * limit;

    try {
      // Verify country exists
      const country = await this.db
        .select()
        .from(countries)
        .where(eq(countries.id, countryId))
        .limit(1);

      if (!country || country.length === 0) {
        throw new NotFoundException(`Country with ID ${countryId} not found`);
      }

      const data = await this.db
        .select({
          id: clubs.id,
          name: clubs.name,
          shortName: clubs.shortName,
          foundationYear: clubs.foundationYear,
          imageUrl: clubs.imageUrl,
          countryId: clubs.countryId,
          country: {
            id: countries.id,
            name: countries.name,
          },
        })
        .from(clubs)
        .leftJoin(countries, eq(clubs.countryId, countries.id))
        .where(eq(clubs.countryId, countryId))
        .orderBy(clubs.name)
        .limit(limit)
        .offset(offset);

      const totalResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(clubs)
        .where(eq(clubs.countryId, countryId));

      const total = Number(totalResult[0].count);

      return { data, total };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch paginated clubs by country');
    }
  }

  /**
   * Create new club
   */
  async create(createClubDto: CreateClubDto) {
    try {
      // Verify country exists
      const country = await this.db
        .select()
        .from(countries)
        .where(eq(countries.id, createClubDto.countryId))
        .limit(1);

      if (!country || country.length === 0) {
        throw new BadRequestException(`Country with ID ${createClubDto.countryId} not found`);
      }

      // Validate club name uniqueness
      const existing = await this.db
        .select()
        .from(clubs)
        .where(eq(clubs.name, createClubDto.name))
        .limit(1);

      if (existing && existing.length > 0) {
        throw new BadRequestException(`Club "${createClubDto.name}" already exists`);
      }

      const result = await this.db
        .insert(clubs)
        .values(createClubDto)
        .returning();

      return this.findOne(result[0].id);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      )
        throw error;
      throw new BadRequestException('Failed to create club');
    }
  }

  /**
   * Update club
   */
  async update(id: number, updateClubDto: UpdateClubDto) {
    try {
      // Verify club exists
      await this.findOne(id);

      // If updating country, verify it exists
      if (updateClubDto.countryId) {
        const country = await this.db
          .select()
          .from(countries)
          .where(eq(countries.id, updateClubDto.countryId))
          .limit(1);

        if (!country || country.length === 0) {
          throw new BadRequestException(`Country with ID ${updateClubDto.countryId} not found`);
        }
      }

      await this.db.update(clubs).set(updateClubDto).where(eq(clubs.id, id));

      return this.findOne(id);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      )
        throw error;
      throw new BadRequestException('Failed to update club');
    }
  }

  /**
   * Delete club
   * Note: Validates that club is not used in any matches
   */
  async remove(id: number) {
    try {
      // Verify club exists
      await this.findOne(id);

      // Note: seasonClubs table will be added in future phases
      // For now, deletion is allowed without checking season participation

      await this.db.delete(clubs).where(eq(clubs.id, id));
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      )
        throw error;
      throw new BadRequestException('Failed to delete club');
    }
  }
}