import { StandingZonesService } from './standing-zones.service';
import { CreateStandingZoneDto, UpdateStandingZoneDto, StandingZoneResponseDto } from '../common/dtos';
export declare class StandingZonesController {
    private readonly service;
    constructor(service: StandingZonesService);
    findAll(sportId?: string, leagueId?: string, seasonId?: string, page?: string, limit?: string, sortBy?: string, sortOrder?: string): Promise<{
        data: any;
        total: any;
    }>;
    findOne(id: number): Promise<StandingZoneResponseDto>;
    create(dto: CreateStandingZoneDto): Promise<{
        id: number;
        sportId: number;
        leagueId: number;
        seasonId: number;
        startPosition: number;
        endPosition: number;
        name: string;
        typeOfStanding: "All" | "Combined" | "Group";
        start_year: number;
        end_year: number;
        flg_priority: boolean;
        colorHex: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: number, dto: UpdateStandingZoneDto): Promise<{
        id: number;
        sportId: number;
        leagueId: number;
        seasonId: number;
        startPosition: number;
        endPosition: number;
        name: string;
        typeOfStanding: "All" | "Combined" | "Group";
        start_year: number;
        end_year: number;
        flg_priority: boolean;
        colorHex: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: number): Promise<{
        success: boolean;
    }>;
}
