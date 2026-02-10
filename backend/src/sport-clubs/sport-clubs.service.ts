import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, inArray } from 'drizzle-orm';
import * as schema from '../db/schema';
import { CreateSportClubDto, UpdateSportClubDto, SportClubResponseDto } from './dto';

@Injectable()
export class SportClubsService {
  constructor(
    @Inject('DRIZZLE')
    private db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Get all sport-club associations
   */
  async findAll(): Promise<SportClubResponseDto[]> {
    return await this.db
      .select({
        id: schema.sportClubs.id,
        sportId: schema.sportClubs.sportId,
        clubId: schema.sportClubs.clubId,
        name: schema.sportClubs.name,
        flgActive: schema.sportClubs.flgActive,
        createdAt: schema.sportClubs.createdAt,
        sport: {
          id: schema.sports.id,
          name: schema.sports.name,
        },
        club: {
          id: schema.clubs.id,
          name: schema.clubs.name,
        },
      })
      .from(schema.sportClubs)
      .leftJoin(schema.sports, eq(schema.sportClubs.sportId, schema.sports.id))
      .leftJoin(schema.clubs, eq(schema.sportClubs.clubId, schema.clubs.id));
  }

  /**
   * Get a specific sport-club association by ID
   */
  async findOne(id: number): Promise<SportClubResponseDto> {
    const result = await this.db
      .select()
      .from(schema.sportClubs)
      .where(eq(schema.sportClubs.id, id));

    if (result.length === 0) {
      throw new NotFoundException(`SportClub with ID ${id} not found`);
    }

    return result[0];
  }

  /**
   * Get all clubs in a specific sport
   */
  async findBySport(sportId: number): Promise<SportClubResponseDto[]> {
    return await this.db
      .select()
      .from(schema.sportClubs)
      .where(eq(schema.sportClubs.sportId, sportId));
  }

  /**
   * Get all sports a club is associated with
   */
  async findByClub(clubId: number): Promise<SportClubResponseDto[]> {
    return await this.db
      .select()
      .from(schema.sportClubs)
      .where(eq(schema.sportClubs.clubId, clubId));
  }

  /**
   * Create a new sport-club association
   */
  async create(dto: CreateSportClubDto): Promise<SportClubResponseDto> {
    // Verify sport exists
    const sport = await this.db
      .select()
      .from(schema.sports)
      .where(eq(schema.sports.id, dto.sportId));
    if (sport.length === 0) {
      throw new BadRequestException(`Sport with ID ${dto.sportId} not found`);
    }

    // Verify club exists
    const club = await this.db
      .select()
      .from(schema.clubs)
      .where(eq(schema.clubs.id, dto.clubId));
    if (club.length === 0) {
      throw new BadRequestException(`Club with ID ${dto.clubId} not found`);
    }

    // Check if association already exists
    const existing = await this.db
      .select()
      .from(schema.sportClubs)
      .where(
        and(
          eq(schema.sportClubs.sportId, dto.sportId),
          eq(schema.sportClubs.clubId, dto.clubId),
        ),
      );
    if (existing.length > 0) {
      throw new BadRequestException(
        `Club ${dto.clubId} is already associated with sport ${dto.sportId}`,
      );
    }

    const result = await this.db
      .insert(schema.sportClubs)
      .values({
        sportId: dto.sportId,
        clubId: dto.clubId,
        flgActive: dto.flgActive !== undefined ? dto.flgActive : true,
      })
      .returning();

    return result[0];
  }

  /**
   * Update a sport-club association
   */
  async update(id: number, dto: UpdateSportClubDto): Promise<SportClubResponseDto> {
    const existing = await this.findOne(id); // Verifies existence

    const result = await this.db
      .update(schema.sportClubs)
      .set({
        name: dto.name !== undefined ? dto.name : existing.name,
        flgActive: dto.flgActive !== undefined ? dto.flgActive : existing.flgActive,
      })
      .where(eq(schema.sportClubs.id, id))
      .returning();

    return result[0];
  }

  /**
   * Remove a sport-club association
   */
  async remove(id: number): Promise<void> {
    const existing = await this.findOne(id); // Verifies existence

    await this.db.delete(schema.sportClubs).where(eq(schema.sportClubs.id, id));
  }

  /**
   * Bulk update sport-club associations for a specific sport with names
   * Used by the drag-and-drop interface when names are also updated
   */
  async bulkUpdateForSportWithNames(sportId: number, sportClubData: { id: number; clubId: number; name: string }[]): Promise<void> {
    // Verify sport exists
    const sport = await this.db
      .select()
      .from(schema.sports)
      .where(eq(schema.sports.id, sportId));
    if (sport.length === 0) {
      throw new BadRequestException(`Sport with ID ${sportId} not found`);
    }

    // Validate that all club IDs in the data exist
    const clubIds = sportClubData.map(item => item.clubId);
    if (clubIds.length > 0) {
      const existingClubs = await this.db
        .select({ id: schema.clubs.id })
        .from(schema.clubs)
        .where(inArray(schema.clubs.id, clubIds));
      
      const existingClubIds = existingClubs.map(c => c.id);
      const invalidClubIds = clubIds.filter(id => !existingClubIds.includes(id));
      
      if (invalidClubIds.length > 0) {
        throw new BadRequestException(`Clubs with IDs ${invalidClubIds.join(', ')} not found`);
      }
    }

    // Get existing associations for this sport
    const existing = await this.db
      .select()
      .from(schema.sportClubs)
      .where(eq(schema.sportClubs.sportId, sportId));

    const existingClubIds = existing.map(sc => sc.clubId);

    // Find clubs to add (in clubIds but not in existingClubIds)
    const clubsToAdd = sportClubData.filter(item => !existingClubIds.includes(item.clubId));

    // Find associations to update (in both arrays)
    const clubsToUpdate = sportClubData.filter(item => existingClubIds.includes(item.clubId));

    // Find associations to remove (in existingClubIds but not in sportClubData)
    const clubsToRemove = existingClubIds.filter(id => !clubIds.includes(id));

    // Add new associations
    for (const item of clubsToAdd) {
      await this.db.insert(schema.sportClubs).values({
        sportId,
        clubId: item.clubId,
        name: item.name || '', // Use the provided name or default to empty string
        flgActive: true,
      });
    }

    // Update existing associations with new names
    for (const item of clubsToUpdate) {
      // Find the existing record to get its ID
      const existingRecord = existing.find(sc => sc.clubId === item.clubId);
      if (existingRecord) {
        await this.db
          .update(schema.sportClubs)
          .set({ name: item.name || '' })
          .where(eq(schema.sportClubs.id, existingRecord.id));
      } else {
        // This shouldn't happen if our logic is correct, but just in case
        await this.db.insert(schema.sportClubs).values({
          sportId,
          clubId: item.clubId,
          name: item.name || '',
          flgActive: true,
        });
      }
    }

    // Remove old associations
    for (const clubId of clubsToRemove) {
      await this.db
        .delete(schema.sportClubs)
        .where(
          and(
            eq(schema.sportClubs.sportId, sportId),
            eq(schema.sportClubs.clubId, clubId),
          ),
        );
    }
  }

  /**
   * Bulk update sport-club associations for a specific sport
   * Used by the drag-and-drop interface
   */
  async bulkUpdateForSport(sportId: number, clubIds: number[]): Promise<void> {
    // Verify sport exists
    const sport = await this.db
      .select()
      .from(schema.sports)
      .where(eq(schema.sports.id, sportId));
    if (sport.length === 0) {
      throw new BadRequestException(`Sport with ID ${sportId} not found`);
    }

    // Get existing associations for this sport
    const existing = await this.db
      .select()
      .from(schema.sportClubs)
      .where(eq(schema.sportClubs.sportId, sportId));

    const existingClubIds = existing.map(sc => sc.clubId);

    // Find clubs to add (in clubIds but not in existingClubIds)
    const clubsToAdd = clubIds.filter(id => !existingClubIds.includes(id));

    // Find associations to remove (in existingClubIds but not in clubIds)
    const clubsToRemove = existingClubIds.filter(id => !clubIds.includes(id));

    // Add new associations
    for (const clubId of clubsToAdd) {
      await this.db.insert(schema.sportClubs).values({
        sportId,
        clubId,
        flgActive: true,
      });
    }

    // Remove old associations
    for (const clubId of clubsToRemove) {
      await this.db
        .delete(schema.sportClubs)
        .where(
          and(
            eq(schema.sportClubs.sportId, sportId),
            eq(schema.sportClubs.clubId, clubId),
          ),
        );
    }
  }
}
