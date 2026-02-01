export declare class CreateLeagueDto {
    originalName: string;
    secondaryName?: string;
    sportId: number;
    countryId?: number;
    cityId?: number;
    flgDefault: boolean;
    typeOfSchedule: 'Round' | 'Date';
    numberOfRoundsMatches: number;
    minDivisionsNumber: number;
    maxDivisionsNumber: number;
    divisionsTime?: number;
    hasOvertimeOverride?: boolean;
    hasPenaltiesOverride?: boolean;
    hasAscends: boolean;
    ascendsQuantity?: number;
    hasDescends: boolean;
    descendsQuantity?: number;
    hasSubLeagues: boolean;
    numberOfSubLeagues?: number;
    flgRoundAutomatic?: boolean;
    imageUrl?: string;
}
declare const UpdateLeagueDto_base: import("@nestjs/common").Type<Partial<CreateLeagueDto>>;
export declare class UpdateLeagueDto extends UpdateLeagueDto_base {
}
export declare class LeagueResponseDto extends CreateLeagueDto {
    id: number;
    createdAt?: Date;
}
export {};
