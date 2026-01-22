import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { CreatePhaseDto, UpdatePhaseDto } from '../common/dtos';
export declare class PhasesService {
    private db;
    constructor(db: NodePgDatabase<typeof schema>);
    findAll(): Promise<{
        id: number;
        seasonId: number;
        name: string;
        type: string;
        order: number;
        createdAt: Date;
    }[]>;
    findOne(id: number): Promise<{
        id: number;
        seasonId: number;
        name: string;
        type: string;
        order: number;
        createdAt: Date;
    }>;
    findBySeason(seasonId: number): Promise<{
        id: number;
        seasonId: number;
        name: string;
        type: string;
        order: number;
        createdAt: Date;
    }[]>;
    create(createPhaseDto: CreatePhaseDto): Promise<{
        id: number;
        name: string;
        type: string;
        createdAt: Date;
        seasonId: number;
        order: number;
    }>;
    update(id: number, updatePhaseDto: UpdatePhaseDto): Promise<{
        id: number;
        seasonId: number;
        name: string;
        type: string;
        order: number;
        createdAt: Date;
    }>;
    remove(id: number): Promise<{
        id: number;
        name: string;
        type: string;
        createdAt: Date;
        seasonId: number;
        order: number;
    }>;
}
