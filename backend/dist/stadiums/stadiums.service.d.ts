import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { CreateStadiumDto, PaginationDto, UpdateStadiumDto, FilteringDto } from '../common/dtos';
export declare class StadiumsService {
    private db;
    constructor(db: NodePgDatabase<typeof schema>);
    findAll(paginationDto: PaginationDto, filteringDto?: FilteringDto): Promise<{
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
    findOne(id: number): Promise<{
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
    }>;
    findByCity(cityId: number, paginationDto: PaginationDto): Promise<{
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
    findByType(type: string): Promise<{
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
    }[]>;
    create(createStadiumDto: CreateStadiumDto): Promise<{
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
    }>;
    update(id: number, updateStadiumDto: UpdateStadiumDto): Promise<{
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
    }>;
    remove(id: number): Promise<void>;
}
