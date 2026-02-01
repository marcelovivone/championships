import { CitiesService } from './cities.service';
import { CreateCityDto, PaginationDto, UpdateCityDto, CityResponseDto, FilteringDto } from '../common/dtos';
export declare class CitiesController {
    private readonly citiesService;
    constructor(citiesService: CitiesService);
    findAll(paginationDto: PaginationDto, filteringDto: FilteringDto, countryId?: string): Promise<{
        data: {
            id: number;
            name: string;
            countryId: number;
            country: {
                id: number;
                name: string;
                continent: string;
                flagUrl: string;
            };
        }[];
        total: number;
    }>;
    findOne(id: number): Promise<CityResponseDto>;
    create(createCityDto: CreateCityDto): Promise<CityResponseDto>;
    update(id: number, updateCityDto: UpdateCityDto): Promise<CityResponseDto>;
    remove(id: number): Promise<void>;
}
