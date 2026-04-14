export declare class CreateStandingOrderRuleDto {
    sportId: number;
    leagueId?: number | null;
    startYear?: number | null;
    endYear?: number | null;
    sortOrder: number;
    criterion: string;
    direction: string;
}
declare const UpdateStandingOrderRuleDto_base: import("@nestjs/common").Type<Partial<CreateStandingOrderRuleDto>>;
export declare class UpdateStandingOrderRuleDto extends UpdateStandingOrderRuleDto_base {
}
export declare class StandingOrderRuleResponseDto extends CreateStandingOrderRuleDto {
    id: number;
    createdAt?: Date;
}
export {};
