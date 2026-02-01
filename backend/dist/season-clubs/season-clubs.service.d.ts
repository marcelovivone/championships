import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { CreateSeasonClubDto, UpdateSeasonClubDto, SeasonClubResponseDto } from './dto';
export declare class SeasonClubsService {
    private db;
    constructor(db: NodePgDatabase<typeof schema>);
    findAll(): Promise<SeasonClubResponseDto[]>;
    findAllPaginated(page: number, limit: number, sortBy: string, sortOrder: 'asc' | 'desc'): Promise<{
        data: {
            id: number;
            sportId: number;
            leagueId: number;
            seasonId: number;
            clubId: number;
            groupId: number;
            createdAt: Date;
            sport: {
                id: number;
                name: string;
            };
            league: {
                id: number;
                originalName: string;
                secondaryName: string;
            };
            season: {
                id: number;
                startYear: number;
                endYear: number;
            };
            club: {
                id: number;
                name: string;
                imageUrl: string;
            };
            group: {
                id: number;
                name: string;
            };
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: number): Promise<SeasonClubResponseDto>;
    findBySeason(seasonId: number): Promise<SeasonClubResponseDto[]>;
    findByClub(clubId: number): Promise<SeasonClubResponseDto[]>;
    isClubActiveInSeason(clubId: number, seasonId: number): Promise<boolean>;
    create(dto: CreateSeasonClubDto): Promise<SeasonClubResponseDto>;
    update(id: number, dto: UpdateSeasonClubDto): Promise<SeasonClubResponseDto>;
    remove(id: number): Promise<void>;
}
