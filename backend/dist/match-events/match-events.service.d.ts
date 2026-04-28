import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { CreateMatchEventDto, UpdateMatchEventDto } from '../common/dtos';
export declare class MatchEventsService {
    private db;
    constructor(db: NodePgDatabase<typeof schema>);
    findAll(): Promise<{
        id: number;
        matchId: number;
        eventType: string;
        clubId: number;
        playerId: number;
        minute: number;
        description: string;
        createdAt: Date;
    }[]>;
    findOne(id: number): Promise<{
        id: number;
        matchId: number;
        eventType: string;
        clubId: number;
        playerId: number;
        minute: number;
        description: string;
        createdAt: Date;
    }>;
    findByMatch(matchId: number): Promise<{
        id: number;
        matchId: number;
        eventType: string;
        clubId: number;
        playerId: number;
        minute: number;
        description: string;
        createdAt: Date;
    }[]>;
    create(createEventDto: CreateMatchEventDto): Promise<{
        id: number;
        createdAt: Date;
        clubId: number;
        matchId: number;
        eventType: string;
        playerId: number;
        minute: number;
        description: string;
    }>;
    update(id: number, updateEventDto: UpdateMatchEventDto): Promise<{
        id: number;
        matchId: number;
        eventType: string;
        clubId: number;
        playerId: number;
        minute: number;
        description: string;
        createdAt: Date;
    }>;
    remove(id: number): Promise<{
        id: number;
        createdAt: Date;
        clubId: number;
        matchId: number;
        eventType: string;
        playerId: number;
        minute: number;
        description: string;
    }>;
}
