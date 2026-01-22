import { MatchesService } from './matches.service';
import { CreateMatchDto, UpdateMatchDto, MatchResponseDto, UpdateMatchScoreDto } from '../common/dtos';
export declare class MatchesController {
    private readonly matchesService;
    constructor(matchesService: MatchesService);
    findAll(phaseId?: string, groupId?: string, roundId?: string): Promise<MatchResponseDto[]>;
    findOne(id: number): Promise<MatchResponseDto>;
    create(createMatchDto: CreateMatchDto): Promise<MatchResponseDto>;
    update(id: number, updateMatchDto: UpdateMatchDto): Promise<MatchResponseDto>;
    updateScore(id: number, updateScoreDto: UpdateMatchScoreDto): Promise<MatchResponseDto>;
    remove(id: number): Promise<void>;
}
