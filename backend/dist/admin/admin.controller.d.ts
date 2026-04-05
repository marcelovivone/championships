import { Request } from 'express';
import { AdminService } from './admin.service';
declare class TimezoneAdjustmentDto {
    leagueId: number;
    seasonId?: number;
    roundId?: number;
    roundIds?: number[];
    matchId?: number;
    adjustmentType: 'country' | 'manual' | 'set';
    manualHours?: number;
    setTime?: string;
    setDate?: string;
    countryTimezone?: string;
}
declare class TimezoneAdjustmentResponseDto {
    success: boolean;
    matchesUpdated: number;
    standingsRecalculated: number;
    details?: any;
    message?: string;
}
export declare class AdminController {
    private readonly adminService;
    private readonly logger;
    constructor(adminService: AdminService);
    timezoneAdjustment(req: Request, dto: TimezoneAdjustmentDto): Promise<TimezoneAdjustmentResponseDto>;
}
export {};
