import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { CreateSportClubDto, UpdateSportClubDto, SportClubResponseDto } from './dto';
export declare class SportClubsService {
    private db;
    constructor(db: NodePgDatabase<typeof schema>);
    findAll(): Promise<SportClubResponseDto[]>;
    findOne(id: number): Promise<SportClubResponseDto>;
    findBySport(sportId: number): Promise<SportClubResponseDto[]>;
    findByClub(clubId: number): Promise<SportClubResponseDto[]>;
    create(dto: CreateSportClubDto): Promise<SportClubResponseDto>;
    update(id: number, dto: UpdateSportClubDto): Promise<SportClubResponseDto>;
    remove(id: number): Promise<void>;
    bulkUpdateForSport(sportId: number, clubIds: number[]): Promise<void>;
}
