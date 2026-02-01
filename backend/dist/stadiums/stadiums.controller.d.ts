import { StadiumsService } from './stadiums.service';
import { CreateStadiumDto, PaginationDto, UpdateStadiumDto, StadiumResponseDto, FilteringDto } from '../common/dtos';
export declare class StadiumsController {
    private readonly stadiumsService;
    constructor(stadiumsService: StadiumsService);
    findAll(paginationDto: PaginationDto, filteringDto: FilteringDto, cityId?: string, type?: string): Promise<{
        data: {
            id: number;
            name: string;
            type: string;
            capacity: number;
            imageUrl: string;
            cityId: number;
            city: {
                id: number;
                name: string;
            };
        }[];
        total: number;
    }>;
    findOne(id: number): Promise<StadiumResponseDto>;
    create(createStadiumDto: CreateStadiumDto): Promise<StadiumResponseDto>;
    update(id: number, updateStadiumDto: UpdateStadiumDto): Promise<StadiumResponseDto>;
    remove(id: number): Promise<void>;
}
