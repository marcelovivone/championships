import { SeasonClubsService } from './season-clubs.service';
import { CreateSeasonClubDto, UpdateSeasonClubDto, SeasonClubResponseDto } from './dto';
export declare class SeasonClubsController {
    private readonly seasonClubsService;
    constructor(seasonClubsService: SeasonClubsService);
    findAll(): Promise<SeasonClubResponseDto[]>;
    findOne(id: string): Promise<SeasonClubResponseDto>;
    findBySeason(seasonId: string): Promise<SeasonClubResponseDto[]>;
    findByClub(clubId: string): Promise<SeasonClubResponseDto[]>;
    create(dto: CreateSeasonClubDto): Promise<SeasonClubResponseDto>;
    update(id: string, dto: UpdateSeasonClubDto): Promise<SeasonClubResponseDto>;
    remove(id: string): Promise<void>;
}
