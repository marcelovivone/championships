import { SportClubsService } from './sport-clubs.service';
import { CreateSportClubDto, UpdateSportClubDto, SportClubResponseDto } from './dto';
export declare class SportClubsController {
    private readonly sportClubsService;
    constructor(sportClubsService: SportClubsService);
    findAll(): Promise<SportClubResponseDto[]>;
    findOne(id: string): Promise<SportClubResponseDto>;
    findBySport(sportId: string): Promise<SportClubResponseDto[]>;
    findByClub(clubId: string): Promise<SportClubResponseDto[]>;
    create(createDto: CreateSportClubDto): Promise<SportClubResponseDto>;
    bulkUpdateForSport(sportId: string, body: {
        clubIds: number[];
    }): Promise<{
        message: string;
    }>;
    update(id: string, updateDto: UpdateSportClubDto): Promise<SportClubResponseDto>;
    remove(id: string): Promise<void>;
}
