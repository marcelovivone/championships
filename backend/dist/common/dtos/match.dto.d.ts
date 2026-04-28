import { MatchStatus } from '../enums/match-status.enum';
export declare class CreateMatchDto {
    sportId: number;
    leagueId: number;
    seasonId: number;
    roundId?: number;
    groupId?: number;
    homeClubId: number;
    awayClubId: number;
    stadiumId?: number;
    date: string;
    seasonPhase?: 'Regular' | 'Play-ins' | 'Playoffs';
    seasonPhaseDetail?: 'Regular' | 'Play-ins' | 'Round of 64' | 'Round of 32' | 'Round of 16' | 'Quarterfinals' | 'Semifinals' | 'Finals';
    homeScore?: number;
    awayScore?: number;
    status?: MatchStatus;
    createdAt?: Date;
    updatedAt?: Date;
}
export declare class UpdateMatchDto {
    sportId?: number;
    leagueId?: number;
    seasonId?: number;
    roundId?: number;
    groupId?: number;
    homeClubId?: number;
    awayClubId?: number;
    stadiumId?: number;
    date?: string;
    seasonPhase?: 'Regular' | 'Play-ins' | 'Playoffs';
    seasonPhaseDetail?: 'Regular' | 'Play-ins' | 'Round of 64' | 'Round of 32' | 'Round of 16' | 'Quarterfinals' | 'Semifinals' | 'Finals';
    homeScore?: number;
    awayScore?: number;
    status?: MatchStatus;
}
export declare class MatchResponseDto {
    id: number;
    sportId: number;
    leagueId: number;
    seasonId: number;
    roundId: number;
    groupId?: number;
    homeClubId: number;
    awayClubId: number;
    stadiumId?: number;
    date: Date;
    seasonPhase?: 'Regular' | 'Play-ins' | 'Playoffs';
    seasonPhaseDetail?: 'Regular' | 'Play-ins' | 'Round of 64' | 'Round of 32' | 'Round of 16' | 'Quarterfinals' | 'Semifinals' | 'Finals';
    homeClubPlaceholder?: string | null;
    awayClubPlaceholder?: string | null;
    homeScore?: number;
    awayScore?: number;
    hasOvertime?: boolean;
    hasPenalties?: boolean;
    status?: MatchStatus;
    createdAt?: Date;
    updatedAt?: Date;
}
export declare class UpdateMatchScoreDto {
    homeScore: number;
    awayScore: number;
}
