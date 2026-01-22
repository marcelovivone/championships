import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { CreateCountryDto, PaginationDto, UpdateCountryDto, FilteringDto } from '../common/dtos';
export declare class CountriesService {
    private db;
    constructor(db: NodePgDatabase<typeof schema>);
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
    findOne(id: number): Promise<{
        id: number;
        name: string;
        continent: string;
        code: string;
        flagUrl: string;
        createdAt: Date;
    }>;
    findByContinent(continent: string): Promise<{
        id: number;
        name: string;
        continent: string;
        code: string;
        flagUrl: string;
        createdAt: Date;
    }[]>;
    create(createCountryDto: CreateCountryDto): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        continent: string;
        code: string;
        flagUrl: string;
    }>;
    update(id: number, updateCountryDto: UpdateCountryDto): Promise<{
        id: number;
        name: string;
        continent: string;
        code: string;
        flagUrl: string;
        createdAt: Date;
    }>;
    remove(id: number): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        continent: string;
        code: string;
        flagUrl: string;
    }>;
}
