import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema';
import { CreateSeasonClubDto, UpdateSeasonClubDto, SeasonClubResponseDto } from './dto';

@Injectable()
export class SeasonClubsService {
  constructor(
    @Inject('DRIZZLE')
    private db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Get all season-club associations
   */
  async findAll(): Promise<SeasonClubResponseDto[]> {
    return await this.db.select().from(schema.seasonClubs);
  }

  /**
   * Get a specific season-club association by ID
   */
  async findOne(id: number): Promise<SeasonClubResponseDto> {
    const result = await this.db
      .select()
      .from(schema.seasonClubs)
      .where(eq(schema.seasonClubs.id, id));

    if (result.length === 0) {
      throw new NotFoundException(`SeasonClub with ID ${id} not found`);
    }

    return result[0];
  }

  /**
   * Get all clubs in a specific season
   */
  async findBySeason(seasonId: number): Promise<SeasonClubResponseDto[]> {
    return await this.db
      .select()
      .from(schema.seasonClubs)
      .where(eq(schema.seasonClubs.seasonId, seasonId));
  }

  /**
   * Get all seasons a club is/was associated with
   */
  async findByClub(clubId: number): Promise<SeasonClubResponseDto[]> {
    return await this.db
      .select()
      .from(schema.seasonClubs)
      .where(eq(schema.seasonClubs.clubId, clubId));
  }

  /**
   * Check if a club is active in a specific season
   */
  async isClubActiveInSeason(clubId: number, seasonId: number): Promise<boolean> {
    const result = await this.db
      .select()
      .from(schema.seasonClubs)
      .where(
        and(
          eq(schema.seasonClubs.clubId, clubId),
          eq(schema.seasonClubs.seasonId, seasonId),
        ),
      );

    if (result.length === 0) {
      return false;
    }

    // Check if the club has not left the season yet (leaveDate is NULL)
    return result[0].leaveDate === null;
  }

  /**
   * Create a new season-club association
   */
  async create(dto: CreateSeasonClubDto): Promise<SeasonClubResponseDto> {
    // Verify season exists
    const season = await this.db
      .select()
      .from(schema.seasons)
      .where(eq(schema.seasons.id, dto.seasonId));
    if (season.length === 0) {
      throw new BadRequestException(`Season with ID ${dto.seasonId} not found`);
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
      .from(schema.seasonClubs)
      .where(
        and(
          eq(schema.seasonClubs.seasonId, dto.seasonId),
          eq(schema.seasonClubs.clubId, dto.clubId),
        ),
      );
    if (existing.length > 0) {
      throw new BadRequestException(
        `Club ${dto.clubId} is already associated with season ${dto.seasonId}`,
      );
    }

    const result = await this.db
      .insert(schema.seasonClubs)
      .values({
        seasonId: dto.seasonId,
        clubId: dto.clubId,
        joinDate: dto.joinDate,
      })
      .returning();

    return result[0];
  }

  /**
   * Update a season-club association (mainly for setting leaveDate)
   */
  async update(id: number, dto: UpdateSeasonClubDto): Promise<SeasonClubResponseDto> {
    const existing = await this.findOne(id); // Verifies existence

    const result = await this.db
      .update(schema.seasonClubs)
      .set({
        leaveDate: dto.leaveDate || existing.leaveDate,
        updatedAt: new Date(),
      })
      .where(eq(schema.seasonClubs.id, id))
      .returning();

    return result[0];
  }

  /**
   * Remove a season-club association
   */
  async remove(id: number): Promise<void> {
    const existing = await this.findOne(id); // Verifies existence

    await this.db.delete(schema.seasonClubs).where(eq(schema.seasonClubs.id, id));
  }
}