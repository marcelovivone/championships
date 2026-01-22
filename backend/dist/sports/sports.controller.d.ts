import { SportsService } from './sports.service';
import { CreateSportDto, UpdateSportDto, SportResponseDto, PaginationDto } from '../common/dtos';
export declare class SportsController {
    private readonly sportsService;
    constructor(sportsService: SportsService);
    findAll(paginationDto: PaginationDto): Promise<{
        data: {
            id: number;
            name: string;
            reducedName: string;
            type: string;
            divisionType: string;
            divisionsNumber: number;
            divisionTime: number;
            scoreType: string;
            hasOvertime: boolean;
            hasPenalties: boolean;
            imageUrl: string;
            createdAt: Date;
        }[];
        total: number;
    }>;
    findOne(id: string): Promise<SportResponseDto>;
    findByType(type: 'collective' | 'individual'): Promise<{
        id: number;
        name: string;
        reducedName: string;
        type: string;
        divisionType: string;
        divisionsNumber: number;
        divisionTime: number;
        scoreType: string;
        hasOvertime: boolean;
        hasPenalties: boolean;
        imageUrl: string;
        createdAt: Date;
    }[]>;
    create(createSportDto: CreateSportDto): Promise<SportResponseDto>;
    update(id: string, updateSportDto: UpdateSportDto): Promise<SportResponseDto>;
    remove(id: string): Promise<void>;
}
