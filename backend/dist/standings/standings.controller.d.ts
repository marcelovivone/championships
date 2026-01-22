import { StandingsService } from './standings.service';
import { CreateStandingDto, UpdateStandingDto, StandingResponseDto } from '../common/dtos';
export declare class StandingsController {
    private readonly standingsService;
    constructor(standingsService: StandingsService);
    findAll(leagueId?: string, roundId?: string): Promise<StandingResponseDto[]>;
    findOne(id: number): Promise<StandingResponseDto>;
    create(createStandingDto: CreateStandingDto): Promise<StandingResponseDto>;
    update(id: number, updateStandingDto: UpdateStandingDto): Promise<StandingResponseDto>;
    remove(id: number): Promise<void>;
}
