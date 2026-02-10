import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, sql, asc, desc } from 'drizzle-orm';
import * as schema from '../db/schema';
import { stadiums, cities, sports } from '../db/schema';
import { CreateStadiumDto, PaginationDto, UpdateStadiumDto, FilteringDto } from '../common/dtos';

@Injectable()
export class StadiumsService {
  constructor(
    @Inject('DRIZZLE')
    private db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Get all stadiums with city and sport information
   */
  async findAll(paginationDto: PaginationDto, filteringDto: FilteringDto = {}) {
    const { page = 1, limit = 10 } = paginationDto;
    const { sortBy = 'name', sortOrder = 'asc' } = filteringDto;
    const offset = (page - 1) * limit;

    const sortableColumns = ['name', 'type', 'capacity', 'cityId', 'sportId'];
    const orderByField = sortableColumns.includes(sortBy) ? sortBy : 'name';
    const order = sortOrder === 'desc' ? desc : asc;

    // Determine the sort column
    let orderByClause: any;
    switch (orderByField) {
      case 'type':
        orderByClause = order(stadiums.type);
        break;
      case 'capacity':
        orderByClause = order(stadiums.capacity);
        break;
      case 'cityId':
        orderByClause = order(stadiums.cityId);
        break;
      case 'sportId':
        orderByClause = order(stadiums.sportId);
        break;
      case 'name':
      default:
        orderByClause = order(stadiums.name);
        break;
    }
    try {
      const data = await this.db
        .select({
          id: stadiums.id,
          name: stadiums.name,
          type: stadiums.type,
          capacity: stadiums.capacity,
          imageUrl: stadiums.imageUrl,
          cityId: stadiums.cityId,
          city: {
            id: cities.id,
            name: cities.name,
          },
          sportId: stadiums.sportId,
          sport: {
            id: sports.id,
            name: sports.name,
          },
        })
        .from(stadiums)
        .leftJoin(cities, eq(stadiums.cityId, cities.id))
        .leftJoin(sports, eq(stadiums.sportId, sports.id))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      const totalResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(stadiums);

      const total = Number(totalResult[0].count);

      return { data, total };
    } catch (error) {
      throw new BadRequestException('Failed to fetch paginated stadiums');
    }
  }

  /**
   * Get stadium by ID with city and sport information
   */
  async findOne(id: number) {
    try {
      const stadium = await this.db
        .select({
          id: stadiums.id,
          name: stadiums.name,
          type: stadiums.type,
          capacity: stadiums.capacity,
          imageUrl: stadiums.imageUrl,
          cityId: stadiums.cityId,
          city: {
            id: cities.id,
            name: cities.name,
          },
          sportId: stadiums.sportId,
          sport: {
            id: sports.id,
            name: sports.name,
          },
        })
        .from(stadiums)
        .leftJoin(cities, eq(stadiums.cityId, cities.id))
        .leftJoin(sports, eq(stadiums.sportId, sports.id))
        .where(eq(stadiums.id, id))
        .limit(1);

      if (!stadium || stadium.length === 0) {
        throw new NotFoundException(`Stadium with ID ${id} not found`);
      }

      return stadium[0];
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch stadium');
    }
  }

  /**
   * Get stadiums by city ID
   */
  async findByCity(cityId: number, paginationDto: PaginationDto, filteringDto: FilteringDto = {}) {
    const { page = 1, limit = 10 } = paginationDto;
    const offset = (page - 1) * limit;

    // Get sortBy and sortOrder from paginationDto
    const { sortBy = 'name', sortOrder = 'asc' } = filteringDto;
    const order = sortOrder === 'desc' ? desc : asc;

    const sortableColumns = ['name', 'type', 'capacity', 'cityId', 'sportId'];
    const orderByField = sortableColumns.includes(sortBy) ? sortBy : 'name';

    // Determine the sort column
    let orderByClause: any;
    switch (orderByField) {
      case 'type':
        orderByClause = order(stadiums.type);
        break;
      case 'capacity':
        orderByClause = order(stadiums.capacity);
        break;
      case 'cityId':
        orderByClause = order(stadiums.cityId);
        break;
      case 'sportId':
        orderByClause = order(stadiums.sportId);
        break;
      case 'name':
      default:
        orderByClause = order(stadiums.name);
        break;
    }

    try {
      // Verify city exists
      const city = await this.db
        .select()
        .from(cities)
        .where(eq(cities.id, cityId))
        .limit(1);

      if (!city || city.length === 0) {
        throw new NotFoundException(`City with ID ${cityId} not found`);
      }

      const data = await this.db
        .select({
          id: stadiums.id,
          name: stadiums.name,
          type: stadiums.type,
          capacity: stadiums.capacity,
          imageUrl: stadiums.imageUrl,
          cityId: stadiums.cityId,
          city: {
            id: cities.id,
            name: cities.name,
          },
          sportId: stadiums.sportId,
          sport: {
            id: sports.id,
            name: sports.name,
          },
        })
          .from(stadiums)
        .leftJoin(cities, eq(stadiums.cityId, cities.id))
        .leftJoin(sports, eq(stadiums.sportId, sports.id))
        .where(eq(stadiums.cityId, cityId))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      const totalResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(stadiums)
        .where(eq(stadiums.cityId, cityId));

      const total = Number(totalResult[0].count);

      return { data, total };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch paginated stadiums by city');
    }
  }

    /**
   * Get stadiums by sport ID
   */
  async findBySport(sportId: number, paginationDto: PaginationDto, filteringDto: FilteringDto = {}) {
    const { page = 1, limit = 10 } = paginationDto;
    const offset = (page - 1) * limit;

    // Get sortBy and sortOrder from paginationDto
    const { sortBy = 'name', sortOrder = 'asc' } = filteringDto;
    const order = sortOrder === 'desc' ? desc : asc;

    const sortableColumns = ['name', 'type', 'capacity', 'cityId', 'sportId'];
    const orderByField = sortableColumns.includes(sortBy) ? sortBy : 'name';

    // Determine the sort column
    let orderByClause: any;
    switch (orderByField) {
      case 'type':
        orderByClause = order(stadiums.type);
        break;
      case 'capacity':
        orderByClause = order(stadiums.capacity);
        break;
      case 'cityId':
        orderByClause = order(stadiums.cityId);
        break;
      case 'sportId':
        orderByClause = order(stadiums.sportId);
        break;
      case 'name':
      default:
        orderByClause = order(stadiums.name);
        break;
    }

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
        .select({
          id: stadiums.id,
          name: stadiums.name,
          type: stadiums.type,
          capacity: stadiums.capacity,
          imageUrl: stadiums.imageUrl,
          cityId: stadiums.cityId,
          city: {
            id: cities.id,
            name: cities.name,
          },
          sportId: stadiums.sportId,
          sport: {
            id: sports.id,
            name: sports.name,
          },
        })
          .from(stadiums)
        .leftJoin(cities, eq(stadiums.cityId, cities.id))
        .leftJoin(sports, eq(stadiums.sportId, sports.id))
        .where(eq(stadiums.sportId, sportId))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      const totalResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(stadiums)
        .where(eq(stadiums.sportId, sportId));

      const total = Number(totalResult[0].count);

      return { data, total };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch paginated stadiums by sport');
    }
  }

  /**
   * Get stadiums by type
   */
  async findByType(type: string) {
    try {
      return await this.db
        .select({
          id: stadiums.id,
          name: stadiums.name,
          type: stadiums.type,
          capacity: stadiums.capacity,
          imageUrl: stadiums.imageUrl,
          cityId: stadiums.cityId,
          city: {
            id: cities.id,
            name: cities.name,
          },
          sportId: stadiums.sportId,
          sport: {
            id: sports.id,
            name: sports.name,
          },
        })
        .from(stadiums)
        .leftJoin(cities, eq(stadiums.cityId, cities.id))
        .leftJoin(sports, eq(stadiums.sportId, sports.id))
        .where(eq(stadiums.type, type))
        .orderBy(stadiums.name);
    } catch (error) {
      throw new BadRequestException('Failed to fetch stadiums by type');
    }
  }

  /**
   * Create new stadium
   */
  async create(createStadiumDto: CreateStadiumDto) {
    try {
      // Verify city exists
      const city = await this.db
        .select()
        .from(cities)
        .where(eq(cities.id, createStadiumDto.cityId))
        .limit(1);

      if (!city || city.length === 0) {
        throw new BadRequestException(`City with ID ${createStadiumDto.cityId} not found`);
      }

      // Verify sport exists
      const sport = await this.db
        .select()
        .from(sports)
        .where(eq(sports.id, createStadiumDto.sportId))
        .limit(1);

      if (!sport || sport.length === 0) {
        throw new BadRequestException(`Sport with ID ${createStadiumDto.sportId} not found`);
      }

      // Validate stadium name is unique
      const existing = await this.db
        .select()
        .from(stadiums)
        .where(eq(stadiums.name, createStadiumDto.name))
        .limit(1);

      if (existing && existing.length > 0) {
        throw new BadRequestException(`Stadium "${createStadiumDto.name}" already exists`);
      }

      const result = await this.db
        .insert(stadiums)
        .values(createStadiumDto)
        .returning();

      return this.findOne(result[0].id);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      )
        throw error;
      throw new BadRequestException('Failed to create stadium');
    }
  }

  /**
   * Update stadium
   */
  async update(id: number, updateStadiumDto: UpdateStadiumDto) {
    try {
      // Verify stadium exists
      await this.findOne(id);

      // If updating city, verify it exists
      if (updateStadiumDto.cityId) {
        const city = await this.db
          .select()
          .from(cities)
          .where(eq(cities.id, updateStadiumDto.cityId))
          .limit(1);

        if (!city || city.length === 0) {
          throw new BadRequestException(`City with ID ${updateStadiumDto.cityId} not found`);
        }
      }
      // If updating sport, verify it exists
      if (updateStadiumDto.sportId) {
        const sport = await this.db
          .select()
          .from(sports)
          .where(eq(sports.id, updateStadiumDto.sportId))
          .limit(1);

        if (!sport || sport.length === 0) {
          throw new BadRequestException(`Sport with ID ${updateStadiumDto.sportId} not found`);
        }
      }

      await this.db
        .update(stadiums)
        .set(updateStadiumDto)
        .where(eq(stadiums.id, id));

      return this.findOne(id);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      )
        throw error;
      throw new BadRequestException('Failed to update stadium');
    }
  }

  /**
   * Delete stadium
   * Note: Validates that no clubs use this stadium
   */
  async remove(id: number) {
    try {
      // Verify stadium exists
      await this.findOne(id);

      // Check if any club stadiums reference this stadium
      const clubStadiums = await this.db
        .select()
        .from(schema.clubStadiums)
        .where(eq(schema.clubStadiums.stadiumId, id))
        .limit(1);

      if (clubStadiums && clubStadiums.length > 0) {
        throw new BadRequestException(
          'Cannot delete stadium. Clubs are using this stadium.',
        );
      }

      await this.db.delete(stadiums).where(eq(stadiums.id, id));
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      )
        throw error;
      throw new BadRequestException('Failed to delete stadium');
    }
  }
}