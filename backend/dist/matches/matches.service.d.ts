import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { CreateMatchDto, UpdateMatchDto, UpdateMatchScoreDto } from '../common/dtos';
import { StandingsService } from '../standings/standings.service';
import { StandingsCalculatorService } from '../standings/standings-calculator.service';
import { MatchStatus } from '../common/enums/match-status.enum';
export declare class MatchesService {
    private db;
    private standingsService;
    private standingsCalculator;
    constructor(db: NodePgDatabase<typeof schema>, standingsService: StandingsService, standingsCalculator: StandingsCalculatorService);
    findAll(): Promise<any[]>;
    findAllPaginated(page: number, limit: number, sortBy: string, sortOrder: 'asc' | 'desc'): Promise<{
        data: any[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: number): Promise<any>;
    ensureExists(id: number): Promise<void>;
    create(createMatchDto: CreateMatchDto): Promise<{
        date: Date;
        id: number;
        createdAt: Date;
        sportId: number;
        stadiumId: number;
        leagueId: number;
        status: "Scheduled" | "Finished" | "Postponed" | "Cancelled";
        seasonId: number;
        groupId: number;
        roundId: number;
        homeClubId: number;
        awayClubId: number;
        homeScore: number;
        awayScore: number;
        updatedAt: Date;
    }>;
    update(id: number, updateMatchDto: UpdateMatchDto): Promise<{
        status: MatchStatus;
        id: number;
        sportId: number;
        leagueId: number;
        seasonId: number;
        roundId: number;
        groupId: number;
        homeClubId: number;
        awayClubId: number;
        stadiumId: number;
        date: Date;
        homeScore: number;
        awayScore: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findByGroup(groupId: number): Promise<{
        status: MatchStatus;
        id: number;
        sportId: number;
        leagueId: number;
        seasonId: number;
        roundId: number;
        groupId: number;
        homeClubId: number;
        awayClubId: number;
        stadiumId: number;
        date: Date;
        homeScore: number;
        awayScore: number;
        createdAt: Date;
        updatedAt: Date;
        sport: {
            id: number;
            name: string;
        };
        league: {
            id: number;
            originalName: string;
        };
        season: {
            id: number;
            startYear: number;
            endYear: number;
        };
        round: {
            id: number;
            roundNumber: number;
        };
        homeClub: {
            id: number;
            name: string;
            shortName: string;
            imageUrl: string;
        };
        awayClub: {
            id: number;
            name: string;
            shortName: string;
            imageUrl: string;
        };
        stadium: {
            id: number;
            name: string;
        };
        group: {
            id: number;
            name: string;
        };
    }[]>;
    findBySportLeagueSeasonAndGroup(sportId: number, leagueId: number, seasonId: number, groupId: number | null): Promise<{
        status: MatchStatus;
        id: number;
        sportId: number;
        leagueId: number;
        seasonId: number;
        roundId: number;
        groupId: number;
        homeClubId: number;
        awayClubId: number;
        stadiumId: number;
        date: Date;
        homeScore: number;
        awayScore: number;
        createdAt: Date;
        updatedAt: Date;
        sport: {
            id: number;
            name: string;
        };
        league: {
            id: number;
            originalName: string;
        };
        season: {
            id: number;
            startYear: number;
            endYear: number;
        };
        round: {
            id: number;
            roundNumber: number;
        };
        homeClub: {
            id: number;
            name: string;
            shortName: string;
            imageUrl: string;
        };
        awayClub: {
            id: number;
            name: string;
            shortName: string;
            imageUrl: string;
        };
        stadium: {
            id: number;
            name: string;
        };
        group: {
            id: number;
            name: string;
        };
    }[]>;
    findBySeasonAndRound(seasonId: number, roundId: number): Promise<any[]>;
    findBySeasonAndDate(seasonId: number, date: string): Promise<any[]>;
    updateScore(id: number, updateScoreDto: UpdateMatchScoreDto): Promise<{
        id: number;
        sportId: number;
        leagueId: number;
        seasonId: number;
        roundId: number;
        groupId: number;
        homeClubId: number;
        awayClubId: number;
        stadiumId: number;
        date: Date;
        status: "Scheduled" | "Finished" | "Postponed" | "Cancelled";
        homeScore: number;
        awayScore: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: number): Promise<{
        date: Date;
        id: number;
        createdAt: Date;
        sportId: number;
        stadiumId: number;
        leagueId: number;
        status: "Scheduled" | "Finished" | "Postponed" | "Cancelled";
        seasonId: number;
        groupId: number;
        roundId: number;
        homeClubId: number;
        awayClubId: number;
        homeScore: number;
        awayScore: number;
        updatedAt: Date;
    }>;
    private attachAvailableStadiums;
    private attachMatchDivisions;
}
