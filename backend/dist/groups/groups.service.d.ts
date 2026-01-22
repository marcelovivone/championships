import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { CreateGroupDto, UpdateGroupDto } from '../common/dtos';
export declare class GroupsService {
    private db;
    constructor(db: NodePgDatabase<typeof schema>);
    findAll(): Promise<{
        id: number;
        phaseId: number;
        name: string;
        createdAt: Date;
    }[]>;
    findOne(id: number): Promise<{
        id: number;
        phaseId: number;
        name: string;
        createdAt: Date;
    }>;
    findByPhase(phaseId: number): Promise<{
        id: number;
        phaseId: number;
        name: string;
        createdAt: Date;
    }[]>;
    create(createGroupDto: CreateGroupDto): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        phaseId: number;
    }>;
    update(id: number, updateGroupDto: UpdateGroupDto): Promise<{
        id: number;
        phaseId: number;
        name: string;
        createdAt: Date;
    }>;
    remove(id: number): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        phaseId: number;
    }>;
}
