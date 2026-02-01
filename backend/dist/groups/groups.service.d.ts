import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
export declare class GroupsService {
    private db;
    constructor(db: NodePgDatabase<typeof schema>);
    findAll(): Promise<{
        id: number;
        name: string;
        seasonId: number;
        sportId: number;
        leagueId: number;
        createdAt: Date;
        season: {
            id: number;
            sportId: number;
            leagueId: number;
            startYear: number;
            endYear: number;
            status: string;
            flgDefault: boolean;
            numberOfGroups: number;
            createdAt: Date;
        };
        sport: {
            id: number;
            name: string;
            reducedName: string;
            type: string;
            divisionType: string;
            minMatchDivisionNumber: number;
            maxMatchDivisionNumber: number;
            divisionTime: number;
            scoreType: string;
            hasOvertime: boolean;
            hasPenalties: boolean;
            flgDefault: boolean;
            imageUrl: string;
            createdAt: Date;
        };
        league: {
            id: number;
            originalName: string;
            secondaryName: string;
            sportId: number;
            countryId: number;
            cityId: number;
            numberOfRoundsMatches: number;
            minDivisionsNumber: number;
            maxDivisionsNumber: number;
            divisionsTime: number;
            hasOvertimeOverride: boolean;
            hasPenaltiesOverride: boolean;
            hasAscends: boolean;
            ascendsQuantity: number;
            hasDescends: boolean;
            descendsQuantity: number;
            hasSubLeagues: boolean;
            numberOfSubLeagues: number;
            flgRoundAutomatic: boolean;
            typeOfSchedule: string;
            imageUrl: string;
            flgDefault: boolean;
            createdAt: Date;
        };
    }[]>;
    findOne(id: number): Promise<{
        id: number;
        name: string;
        sportId: number;
        leagueId: number;
        seasonId: number;
        createdAt: Date;
    }>;
    findBySeason(seasonId: number): Promise<{
        id: number;
        name: string;
        sportId: number;
        leagueId: number;
        seasonId: number;
        createdAt: Date;
    }[]>;
    create(createGroupDto: CreateGroupDto): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        sportId: number;
        leagueId: number;
        seasonId: number;
    }>;
    update(id: number, updateGroupDto: UpdateGroupDto): Promise<{
        id: number;
        name: string;
        sportId: number;
        leagueId: number;
        seasonId: number;
        createdAt: Date;
    }>;
    remove(id: number): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        sportId: number;
        leagueId: number;
        seasonId: number;
    }>;
}
