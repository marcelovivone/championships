import { PhasesService } from './phases.service';
import { CreatePhaseDto, UpdatePhaseDto, PhaseResponseDto } from '../common/dtos';
export declare class PhasesController {
    private readonly phasesService;
    constructor(phasesService: PhasesService);
    findAll(seasonId?: string): Promise<PhaseResponseDto[]>;
    findOne(id: number): Promise<PhaseResponseDto>;
    create(createPhaseDto: CreatePhaseDto): Promise<PhaseResponseDto>;
    update(id: number, updatePhaseDto: UpdatePhaseDto): Promise<PhaseResponseDto>;
    remove(id: number): Promise<void>;
}
