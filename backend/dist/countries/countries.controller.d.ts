import { CountriesService } from './countries.service';
import { CreateCountryDto, UpdateCountryDto, CountryResponseDto, PaginationDto, FilteringDto } from '../common/dtos';
export declare class CountriesController {
    private readonly countriesService;
    constructor(countriesService: CountriesService);
    findAll(paginationDto: PaginationDto, filteringDto: FilteringDto): Promise<{
        data: {
            id: number;
            name: string;
            continent: string;
            code: string;
            flagUrl: string;
            createdAt: Date;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: number): Promise<CountryResponseDto>;
    findByContinent(continent: string): Promise<CountryResponseDto[]>;
    create(createCountryDto: CreateCountryDto): Promise<CountryResponseDto>;
    update(id: number, updateCountryDto: UpdateCountryDto): Promise<CountryResponseDto>;
    remove(id: number): Promise<void>;
}
