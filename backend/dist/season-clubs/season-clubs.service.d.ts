import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { CreateSeasonClubDto, UpdateSeasonClubDto, SeasonClubResponseDto } from './dto';
export declare class SeasonClubsService {
    private db;
    constructor(db: NodePgDatabase<typeof schema>);
    findAll(): Promise<SeasonClubResponseDto[]>;
    findOne(id: number): Promise<SeasonClubResponseDto>;
    findBySeason(seasonId: number): Promise<SeasonClubResponseDto[]>;
    findByClub(clubId: number): Promise<SeasonClubResponseDto[]>;
    isClubActiveInSeason(clubId: number, seasonId: number): Promise<boolean>;
    create(dto: CreateSeasonClubDto): Promise<SeasonClubResponseDto>;
    update(id: number, dto: UpdateSeasonClubDto): Promise<SeasonClubResponseDto>;
    remove(id: number): Promise<void>;
}
