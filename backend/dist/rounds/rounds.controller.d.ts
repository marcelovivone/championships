import { RoundsService } from './rounds.service';
import { CreateRoundDto, UpdateRoundDto } from '../common/dtos';
export declare class RoundsController {
    private readonly roundsService;
    constructor(roundsService: RoundsService);
    findAll(seasonId?: string, leagueId?: string, page?: string, limit?: string, sortBy?: string, sortOrder?: string): Promise<any>;
    findOne(id: number): Promise<any>;
    create(createRoundDto: CreateRoundDto): Promise<any>;
    update(id: number, updateRoundDto: UpdateRoundDto): Promise<any>;
    remove(id: number): Promise<void>;
}
