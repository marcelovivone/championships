import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../db/schema';
import { cities, countries } from '../db/schema';
import { CreateCityDto, PaginationDto, UpdateCityDto } from '../common/dtos';

@Injectable()
export class CitiesService {
  constructor(
    @Inject('DRIZZLE')
    private db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Get all cities with country information
   */
  async findAll(paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const offset = (page - 1) * limit;

    try {
      const data = await this.db
        .select({
          id: cities.id,
          name: cities.name,
          countryId: cities.countryId,
          country: {
            id: countries.id,
            name: countries.name,
            continent: countries.continent,
            flagUrl: countries.flagUrl,
          },
        })
        .from(cities)
        .leftJoin(countries, eq(cities.countryId, countries.id))
        .orderBy(cities.name)
        .limit(limit)
        .offset(offset);

      const totalResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(cities);

      const total = Number(totalResult[0].count);

      return { data, total };
    } catch (error) {
      throw new BadRequestException('Failed to fetch paginated cities');
    }
  }

  /**
   * Get city by ID with country information
   */
  async findOne(id: number) {
    try {
      const city = await this.db
        .select({
          id: cities.id,
          name: cities.name,
          countryId: cities.countryId,
          country: {
            id: countries.id,
            name: countries.name,
            continent: countries.continent,
            flagUrl: countries.flagUrl,
          },
        })
        .from(cities)
        .leftJoin(countries, eq(cities.countryId, countries.id))
        .where(eq(cities.id, id))
        .limit(1);

      if (!city || city.length === 0) {
        throw new NotFoundException(`City with ID ${id} not found`);
      }

      return city[0];
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch city');
    }
  }

  /**
   * Get cities by country ID
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
          id: cities.id,
          name: cities.name,
          countryId: cities.countryId,
          country: {
            id: countries.id,
            name: countries.name,
            continent: countries.continent,
            flagUrl: countries.flagUrl,
          },
        })
        .from(cities)
        .leftJoin(countries, eq(cities.countryId, countries.id))
        .where(eq(cities.countryId, countryId))
        .orderBy(cities.name)
        .limit(limit)
        .offset(offset);

      const totalResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(cities)
        .where(eq(cities.countryId, countryId));

      const total = Number(totalResult[0].count);

      return { data, total };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch paginated cities by country');
    }
  }

  /**
   * Create new city
   */
  async create(createCityDto: CreateCityDto) {
    try {
      // Verify country exists
      const country = await this.db
        .select()
        .from(countries)
        .where(eq(countries.id, createCityDto.countryId))
        .limit(1);

      if (!country || country.length === 0) {
        throw new BadRequestException(`Country with ID ${createCityDto.countryId} not found`);
      }

      // Validate city name uniqueness within country
      const existing = await this.db
        .select()
        .from(cities)
        .where(eq(cities.name, createCityDto.name))
        .limit(1);

      if (existing && existing.length > 0) {
        throw new BadRequestException(`City "${createCityDto.name}" already exists`);
      }

      const result = await this.db
        .insert(cities)
        .values(createCityDto)
        .returning();

      // Return with country info
      return this.findOne(result[0].id);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      )
        throw error;
      throw new BadRequestException('Failed to create city');
    }
  }

  /**
   * Update city
   */
  async update(id: number, updateCityDto: UpdateCityDto) {
    try {
      // Verify city exists
      await this.findOne(id);

      // If updating country, verify it exists
      if (updateCityDto.countryId) {
        const country = await this.db
          .select()
          .from(countries)
          .where(eq(countries.id, updateCityDto.countryId))
          .limit(1);

        if (!country || country.length === 0) {
          throw new BadRequestException(
            `Country with ID ${updateCityDto.countryId} not found`,
          );
        }
      }

      await this.db
        .update(cities)
        .set(updateCityDto)
        .where(eq(cities.id, id));

      // Return updated city with country info
      return this.findOne(id);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      )
        throw error;
      throw new BadRequestException('Failed to update city');
    }
  }

  /**
   * Delete city
   * Note: Validates that no stadiums use this city
   */
  async remove(id: number) {
    try {
      // Verify city exists
      await this.findOne(id);

      // Check if any stadiums use this city
      const stadiums = await this.db
        .select()
        .from(schema.stadiums)
        .where(eq(schema.stadiums.cityId, id))
        .limit(1);

      if (stadiums && stadiums.length > 0) {
        throw new BadRequestException(
          'Cannot delete city. Stadiums are located in this city.',
        );
      }

      await this.db.delete(cities).where(eq(cities.id, id));
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      )
        throw error;
      throw new BadRequestException('Failed to delete city');
    }
  }
}