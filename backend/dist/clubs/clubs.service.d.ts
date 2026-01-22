import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { CreateClubDto, PaginationDto, UpdateClubDto } from '../common/dtos';
export declare class ClubsService {
    private db;
    constructor(db: NodePgDatabase<typeof schema>);
    findAll(paginationDto: PaginationDto): Promise<{
        data: {
            id: number;
            name: string;
            shortName: string;
            foundationYear: number;
            imageUrl: string;
            countryId: number;
            country: {
                id: number;
                name: string;
            };
        }[];
        total: number;
    }>;
    findOne(id: number): Promise<{
        id: number;
        name: string;
        shortName: string;
        foundationYear: number;
        imageUrl: string;
        countryId: number;
        country: {
            id: number;
            name: string;
        };
    }>;
    findByCountry(countryId: number, paginationDto: PaginationDto): Promise<{
        data: {
            id: number;
            name: string;
            shortName: string;
            foundationYear: number;
            imageUrl: string;
            countryId: number;
            country: {
                id: number;
                name: string;
            };
        }[];
        total: number;
    }>;
    create(createClubDto: CreateClubDto): Promise<{
        id: number;
        name: string;
        shortName: string;
        foundationYear: number;
        imageUrl: string;
        countryId: number;
        country: {
            id: number;
            name: string;
        };
    }>;
    update(id: number, updateClubDto: UpdateClubDto): Promise<{
        id: number;
        name: string;
        shortName: string;
        foundationYear: number;
        imageUrl: string;
        countryId: number;
        country: {
            id: number;
            name: string;
        };
    }>;
    remove(id: number): Promise<void>;
}
