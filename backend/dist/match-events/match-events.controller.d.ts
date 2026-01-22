import { MatchEventsService } from './match-events.service';
import { CreateMatchEventDto, UpdateMatchEventDto, MatchEventResponseDto } from '../common/dtos';
export declare class MatchEventsController {
    private readonly matchEventsService;
    constructor(matchEventsService: MatchEventsService);
    findAll(matchId?: string): Promise<MatchEventResponseDto[]>;
    findOne(id: number): Promise<MatchEventResponseDto>;
    create(createMatchEventDto: CreateMatchEventDto): Promise<MatchEventResponseDto>;
    update(id: number, updateMatchEventDto: UpdateMatchEventDto): Promise<MatchEventResponseDto>;
    remove(id: number): Promise<void>;
}
