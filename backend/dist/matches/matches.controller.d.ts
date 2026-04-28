import { MatchesService } from './matches.service';
import { CreateMatchDto, UpdateMatchDto, UpdateMatchScoreDto, MatchResponseDto } from '../common/dtos';
export declare class MatchesController {
    private readonly matchesService;
    constructor(matchesService: MatchesService);
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
        homeClubPlaceholder: string;
        awayClubPlaceholder: string;
        seasonPhase: "Regular" | "Play-ins" | "Playoffs";
        seasonPhaseDetail: "Regular" | "Play-ins" | "Round of 64" | "Round of 32" | "Round of 16" | "Quarterfinals" | "Semifinals" | "Finals";
        homeScore: number;
        awayScore: number;
        originApiId: string;
        updatedAt: Date;
    }>;
    findAll(groupId?: string, roundId?: string, sportId?: string, leagueId?: string, seasonId?: string, date?: string, seasonPhase?: string, seasonPhaseDetail?: string, page?: string, limit?: string, sortBy?: string, sortOrder?: string): Promise<MatchResponseDto[]>;
    getPostseasonBracket(leagueId?: string, seasonId?: string, groupId?: string): Promise<{
        season: {
            id: number;
            sportId: number;
            leagueId: number;
            flgHasPostseason: boolean;
            currentPhase: "Regular" | "Play-ins" | "Playoffs";
            currentPhaseDetail: "Regular" | "Play-ins" | "Round of 64" | "Round of 32" | "Round of 16" | "Quarterfinals" | "Semifinals" | "Finals";
        };
        regularSeasonStandings: {
            clubId: any;
            groupId: any;
            position: any;
            points: any;
        }[];
        phases: {
            phase: string;
            detail: string;
            matches: {
                status: import("../common/enums/match-status.enum").MatchStatus;
                id: number;
                sportId: number;
                leagueId: number;
                seasonId: number;
                roundId: number;
                groupId: number;
                homeClubId: number;
                awayClubId: number;
                homeClubPlaceholder: string;
                awayClubPlaceholder: string;
                stadiumId: number;
                date: Date;
                seasonPhase: "Regular" | "Play-ins" | "Playoffs";
                seasonPhaseDetail: "Regular" | "Play-ins" | "Round of 64" | "Round of 32" | "Round of 16" | "Quarterfinals" | "Semifinals" | "Finals";
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
            }[];
        }[];
    }>;
    findOne(id: number): Promise<any>;
    update(id: number, updateMatchDto: UpdateMatchDto): Promise<MatchResponseDto>;
    updateScore(id: number, updateScoreDto: UpdateMatchScoreDto): Promise<{
        id: number;
        sportId: number;
        leagueId: number;
        seasonId: number;
        roundId: number;
        groupId: number;
        homeClubId: number;
        awayClubId: number;
        homeClubPlaceholder: string;
        awayClubPlaceholder: string;
        stadiumId: number;
        date: Date;
        status: "Scheduled" | "Finished" | "Postponed" | "Cancelled";
        seasonPhase: "Regular" | "Play-ins" | "Playoffs";
        seasonPhaseDetail: "Regular" | "Play-ins" | "Round of 64" | "Round of 32" | "Round of 16" | "Quarterfinals" | "Semifinals" | "Finals";
        homeScore: number;
        awayScore: number;
        originApiId: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: number): Promise<any>;
}
