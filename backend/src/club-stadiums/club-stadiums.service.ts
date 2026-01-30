import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { eq, and, isNull } from 'drizzle-orm';
import * as schema from '../db/schema';
import { CreateClubStadiumDto } from './dto/create-club-stadium.dto';
import { UpdateClubStadiumDto } from './dto/update-club-stadium.dto';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class ClubStadiumsService {
  constructor(@Inject('DRIZZLE') private db: NodePgDatabase<typeof schema>) {}

  async create(createClubStadiumDto: CreateClubStadiumDto) {
    // Removed validation to allow multiple stadiums for the same club at any time
    // Also allows the same stadium to be used by multiple clubs

    const [clubStadium] = await this.db
      .insert(schema.clubStadiums)
      .values({
        clubId: createClubStadiumDto.clubId,
        stadiumId: createClubStadiumDto.stadiumId,
        startDate: new Date(createClubStadiumDto.startDate),
        endDate: createClubStadiumDto.endDate ? new Date(createClubStadiumDto.endDate) : null,
      })
      .returning();

    return clubStadium;
  }

  async findAll() {
    return this.db
      .select({
        id: schema.clubStadiums.id,
        clubId: schema.clubStadiums.clubId,
        stadiumId: schema.clubStadiums.stadiumId,
        startDate: schema.clubStadiums.startDate,
        endDate: schema.clubStadiums.endDate,
        club: {
          id: schema.clubs.id,
          name: schema.clubs.name,
        },
        stadium: {
          id: schema.stadiums.id,
          name: schema.stadiums.name,
        },
      })
      .from(schema.clubStadiums)
      .leftJoin(schema.clubs, eq(schema.clubStadiums.clubId, schema.clubs.id))
      .leftJoin(schema.stadiums, eq(schema.clubStadiums.stadiumId, schema.stadiums.id));
  }

  async findByClub(clubId: number) {
    return this.db
      .select()
      .from(schema.clubStadiums)
      .where(eq(schema.clubStadiums.clubId, clubId));
  }

  async findActiveByClub(clubId: number) {
    const [active] = await this.db
      .select()
      .from(schema.clubStadiums)
      .where(
        and(
          eq(schema.clubStadiums.clubId, clubId),
          isNull(schema.clubStadiums.endDate)
        )
      )
      .limit(1);

    return active || null;
  }

  async findOne(id: number) {
    const [clubStadium] = await this.db
      .select()
      .from(schema.clubStadiums)
      .where(eq(schema.clubStadiums.id, id))
      .limit(1);

    if (!clubStadium) {
      throw new NotFoundException(`Club stadium with ID ${id} not found`);
    }

    return clubStadium;
  }

  async update(id: number, updateClubStadiumDto: UpdateClubStadiumDto) {
    const existing = await this.findOne(id);

    // Removed validation to allow multiple stadiums for the same club at any time
    // Also allows the same stadium to be used by multiple clubs

    const updateData: any = {};
    if (updateClubStadiumDto.clubId !== undefined) updateData.clubId = updateClubStadiumDto.clubId;
    if (updateClubStadiumDto.stadiumId !== undefined) updateData.stadiumId = updateClubStadiumDto.stadiumId;
    if (updateClubStadiumDto.startDate !== undefined) updateData.startDate = new Date(updateClubStadiumDto.startDate);
    if (updateClubStadiumDto.endDate !== undefined) {
      updateData.endDate = updateClubStadiumDto.endDate ? new Date(updateClubStadiumDto.endDate) : null;
    }

    const [updated] = await this.db
      .update(schema.clubStadiums)
      .set(updateData)
      .where(eq(schema.clubStadiums.id, id))
      .returning();

    return updated;
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.db.delete(schema.clubStadiums).where(eq(schema.clubStadiums.id, id));
    return { message: 'Club stadium deleted successfully' };
  }
}