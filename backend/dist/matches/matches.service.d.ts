import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { MatchSelectSchema } from '../db/schema';
import { CreateMatchDto, UpdateMatchDto } from '../common/dtos/match.dto';
export declare class MatchesService {
    private db;
    constructor(db: NodePgDatabase);
    findAllPaginated(page: number, limit: number, sortBy?: string, sortOrder?: 'asc' | 'desc'): Promise<{
        data: {
            id: number;
            sportId: number;
            leagueId: number;
            seasonId: number;
            roundId: number;
            groupId: number | null;
            turn: number;
            homeClubId: number;
            awayClubId: number;
            stadiumId: number | null;
            date: Date;
            status: string;
            homeScore: number | null;
            awayScore: number | null;
            hasOvertime: boolean;
            hasPenalties: boolean;
            createdAt: Date;
            updatedAt: Date | null;
            sportName: string;
            leagueName: string;
            seasonStartYear: number;
            seasonEndYear: number;
            roundNumber: number;
            groupName: string | null;
            homeClubName: string;
            awayClubName: string;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: number): Promise<MatchSelectSchema>;
    create(createMatchDto: CreateMatchDto): Promise<MatchSelectSchema>;
    update(id: number, updateMatchDto: UpdateMatchDto): Promise<MatchSelectSchema>;
    remove(id: number): Promise<MatchSelectSchema>;
}
