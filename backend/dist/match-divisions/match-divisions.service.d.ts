import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { CreateMatchDivisionDto, UpdateMatchDivisionDto } from '../common/dtos';
export declare class MatchDivisionsService {
    private db;
    constructor(db: NodePgDatabase<typeof schema>);
    findAll(): Promise<{
        id: number;
        matchId: number;
        divisionNumber: number;
        divisionType: string;
        homeScore: number;
        awayScore: number;
        createdAt: Date;
    }[]>;
    findOne(id: number): Promise<{
        id: number;
        matchId: number;
        divisionNumber: number;
        divisionType: string;
        homeScore: number;
        awayScore: number;
        createdAt: Date;
    }>;
    findByMatch(matchId: number): Promise<{
        id: number;
        matchId: number;
        divisionNumber: number;
        divisionType: string;
        homeScore: number;
        awayScore: number;
        createdAt: Date;
    }[]>;
    create(createDivisionDto: CreateMatchDivisionDto): Promise<{
        id: number;
        divisionType: string;
        createdAt: Date;
        homeScore: number;
        awayScore: number;
        matchId: number;
        divisionNumber: number;
    }>;
    update(id: number, updateDivisionDto: UpdateMatchDivisionDto): Promise<{
        id: number;
        matchId: number;
        divisionNumber: number;
        divisionType: string;
        homeScore: number;
        awayScore: number;
        createdAt: Date;
    }>;
    remove(id: number): Promise<{
        id: number;
        divisionType: string;
        createdAt: Date;
        homeScore: number;
        awayScore: number;
        matchId: number;
        divisionNumber: number;
    }>;
}
