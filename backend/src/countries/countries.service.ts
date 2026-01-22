import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, sql, and, or, ilike, asc, desc } from 'drizzle-orm';
import * as schema from '../db/schema';
import { countries } from '../db/schema';
import { CreateCountryDto, PaginationDto, UpdateCountryDto, FilteringDto } from '../common/dtos';

@Injectable()
export class CountriesService {
  constructor(
    @Inject('DRIZZLE')
    private db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Get all countries with pagination, sorting, and filtering
   */
  async findAll(paginationDto: PaginationDto, filteringDto: FilteringDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const { sortBy, sortOrder, search } = filteringDto;
    const offset = (page - 1) * limit;

    const sortableColumns = ['name', 'continent', 'code'];
    const orderBy = sortableColumns.includes(sortBy) ? sortBy : 'name';
    const order = sortOrder === 'desc' ? desc : asc;

    // Build WHERE clause
    const whereConditions = [];
    if (search) {
      whereConditions.push(
        or(
          ilike(countries.name, `%${search}%`),
          ilike(countries.code, `%${search}%`),
          ilike(countries.continent, `%${search}%`),
        ),
      );
    }
    const finalWhere = and(...whereConditions);

    try {
      const query = this.db.select().from(countries).where(finalWhere);

      // Get total count matching the filter
      const totalResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(countries)
        .where(finalWhere);
      
      const total = Number(totalResult[0].count);
      
      // Get paginated and sorted data
      const data = await query
        .orderBy(order(countries[orderBy]))
        .limit(limit)
        .offset(offset);

      return { data, total, page, limit };
    } catch (error) {
      console.error('Error fetching countries:', error);
      throw new BadRequestException('Failed to fetch paginated and filtered countries');
    }
  }

  /**
   * Get country by ID
   */
  async findOne(id: number) {
    try {
      const country = await this.db
        .select()
        .from(countries)
        .where(eq(countries.id, id))
        .limit(1);

      if (!country || country.length === 0) {
        throw new NotFoundException(`Country with ID ${id} not found`);
      }

      return country[0];
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch country');
    }
  }

  /**
   * Get countries by continent
   */
  async findByContinent(continent: string) {
    try {
      return await this.db
        .select()
        .from(countries)
        .where(eq(countries.continent, continent));
    } catch (error) {
      throw new BadRequestException('Failed to fetch countries by continent');
    }
  }

  /**
   * Create new country
   */
  async create(createCountryDto: CreateCountryDto) {
    try {
      // Validate uniqueness of country code and name
      const existing = await this.db
        .select()
        .from(countries)
        .where(eq(countries.code, createCountryDto.code))
        .limit(1);

      if (existing && existing.length > 0) {
        throw new BadRequestException(`Country with code "${createCountryDto.code}" already exists`);
      }

      const result = await this.db
        .insert(countries)
        .values(createCountryDto)
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to create country');
    }
  }

  /**
   * Update country
   */
  async update(id: number, updateCountryDto: UpdateCountryDto) {
    try {
      // Verify country exists
      await this.findOne(id);

      // If updating code, check uniqueness
      if (updateCountryDto.code) {
        const existing = await this.db
          .select()
          .from(countries)
          .where(eq(countries.code, updateCountryDto.code))
          .limit(1);

        if (existing && existing.length > 0 && existing[0].id !== id) {
          throw new BadRequestException(`Country with code "${updateCountryDto.code}" already exists`);
        }
      }

      const result = await this.db
        .update(countries)
        .set(updateCountryDto)
        .where(eq(countries.id, id))
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException)
        throw error;
      throw new BadRequestException('Failed to update country');
    }
  }

  /**
   * Delete country
   * Note: Validates that no cities use this country
   */
  async remove(id: number) {
    try {
      // Verify country exists
      await this.findOne(id);

      // Check if any cities use this country
      const cities = await this.db
        .select()
        .from(schema.cities)
        .where(eq(schema.cities.countryId, id))
        .limit(1);

      if (cities && cities.length > 0) {
        throw new BadRequestException(
          'Cannot delete country. Cities are associated with this country.',
        );
      }

      const result = await this.db
        .delete(countries)
        .where(eq(countries.id, id))
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException)
        throw error;
      throw new BadRequestException('Failed to delete country');
    }
  }
}