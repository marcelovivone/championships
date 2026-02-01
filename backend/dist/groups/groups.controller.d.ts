import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
export declare class GroupsController {
    private readonly groupsService;
    constructor(groupsService: GroupsService);
    findAll(seasonId?: string): Promise<{
        id: number;
        name: string;
        sportId: number;
        leagueId: number;
        seasonId: number;
        createdAt: Date;
    }[]>;
    findOne(id: number): Promise<{
        id: number;
        name: string;
        sportId: number;
        leagueId: number;
        seasonId: number;
        createdAt: Date;
    }>;
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
    remove(id: number): Promise<void>;
}
