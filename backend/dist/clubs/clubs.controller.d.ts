import { ClubsService } from './clubs.service';
import { CreateClubDto, PaginationDto, UpdateClubDto } from '../common/dtos';
export declare class ClubsController {
    private readonly clubsService;
    constructor(clubsService: ClubsService);
    findAll(paginationDto: PaginationDto, countryId?: string): Promise<{
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
