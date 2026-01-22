import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../db/schema';
import { stadiums, cities } from '../db/schema';
import { CreateStadiumDto, PaginationDto, UpdateStadiumDto } from '../common/dtos';

@Injectable()
export class StadiumsService {
  constructor(
    @Inject('DRIZZLE')
    private db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Get all stadiums with city information
   */
  async findAll(paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const offset = (page - 1) * limit;

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
        })
        .from(stadiums)
        .leftJoin(cities, eq(stadiums.cityId, cities.id))
        .orderBy(stadiums.name)
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
   * Get stadium by ID with city information
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
        })
        .from(stadiums)
        .leftJoin(cities, eq(stadiums.cityId, cities.id))
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
  async findByCity(cityId: number, paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const offset = (page - 1) * limit;

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
        })
        .from(stadiums)
        .leftJoin(cities, eq(stadiums.cityId, cities.id))
        .where(eq(stadiums.cityId, cityId))
        .orderBy(stadiums.name)
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
        })
        .from(stadiums)
        .leftJoin(cities, eq(stadiums.cityId, cities.id))
        .where(eq(stadiums.type, type));
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