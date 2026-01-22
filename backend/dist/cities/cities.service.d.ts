import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { CreateCityDto, PaginationDto, UpdateCityDto } from '../common/dtos';
export declare class CitiesService {
    private db;
    constructor(db: NodePgDatabase<typeof schema>);
    findAll(paginationDto: PaginationDto): Promise<{
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
    findOne(id: number): Promise<{
        id: number;
        name: string;
        countryId: number;
        country: {
            id: number;
            name: string;
            continent: string;
            flagUrl: string;
        };
    }>;
    findByCountry(countryId: number, paginationDto: PaginationDto): Promise<{
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
    create(createCityDto: CreateCityDto): Promise<{
        id: number;
        name: string;
        countryId: number;
        country: {
            id: number;
            name: string;
            continent: string;
            flagUrl: string;
        };
    }>;
    update(id: number, updateCityDto: UpdateCityDto): Promise<{
        id: number;
        name: string;
        countryId: number;
        country: {
            id: number;
            name: string;
            continent: string;
            flagUrl: string;
        };
    }>;
    remove(id: number): Promise<void>;
}
