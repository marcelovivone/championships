import * as schema from '../db/schema';
import { CreateClubStadiumDto } from './dto/create-club-stadium.dto';
import { UpdateClubStadiumDto } from './dto/update-club-stadium.dto';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
export declare class ClubStadiumsService {
    private db;
    constructor(db: NodePgDatabase<typeof schema>);
    create(createClubStadiumDto: CreateClubStadiumDto): Promise<{
        id: number;
        createdAt: Date;
        clubId: number;
        stadiumId: number;
        startDate: Date;
        endDate: Date;
    }>;
    findAll(): Promise<{
        id: number;
        clubId: number;
        stadiumId: number;
        startDate: Date;
        endDate: Date;
        club: {
            id: number;
            name: string;
        };
        stadium: {
            id: number;
            name: string;
        };
    }[]>;
    findByClub(clubId: number): Promise<{
        id: number;
        clubId: number;
        stadiumId: number;
        startDate: Date;
        endDate: Date;
        createdAt: Date;
    }[]>;
    findActiveByClub(clubId: number): Promise<{
        id: number;
        clubId: number;
        stadiumId: number;
        startDate: Date;
        endDate: Date;
        createdAt: Date;
    }>;
    findOne(id: number): Promise<{
        id: number;
        clubId: number;
        stadiumId: number;
        startDate: Date;
        endDate: Date;
        createdAt: Date;
    }>;
    update(id: number, updateClubStadiumDto: UpdateClubStadiumDto): Promise<{
        id: number;
        clubId: number;
        stadiumId: number;
        startDate: Date;
        endDate: Date;
        createdAt: Date;
    }>;
    remove(id: number): Promise<{
        message: string;
    }>;
}
