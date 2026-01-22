import { MatchDivisionsService } from './match-divisions.service';
import { CreateMatchDivisionDto, UpdateMatchDivisionDto, MatchDivisionResponseDto } from '../common/dtos';
export declare class MatchDivisionsController {
    private readonly matchDivisionsService;
    constructor(matchDivisionsService: MatchDivisionsService);
    findAll(matchId?: string): Promise<MatchDivisionResponseDto[]>;
    findOne(id: number): Promise<MatchDivisionResponseDto>;
    create(createMatchDivisionDto: CreateMatchDivisionDto): Promise<MatchDivisionResponseDto>;
    update(id: number, updateMatchDivisionDto: UpdateMatchDivisionDto): Promise<MatchDivisionResponseDto>;
    remove(id: number): Promise<void>;
}
