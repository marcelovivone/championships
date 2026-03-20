import { StandingsService } from './standings.service';
import { CreateStandingDto, StandingResponseDto } from '../common/dtos';
export declare class StandingsController {
    private readonly standingsService;
    constructor(standingsService: StandingsService);
    private toStandingResponseDto;
    getByLeagueSeasonRoundOrMatchDate(leagueId?: string, seasonId?: string, roundId?: string, matchDate?: string, clubId?: string): Promise<StandingResponseDto[]>;
    findAll(roundId?: string, matchDate?: string): Promise<StandingResponseDto[]>;
    findOne(id: number): Promise<StandingResponseDto>;
    create(createStandingDto: CreateStandingDto): Promise<StandingResponseDto>;
    strictRemove(matchId?: number, standingId?: number): Promise<void>;
    remove(id: number): Promise<void>;
}
