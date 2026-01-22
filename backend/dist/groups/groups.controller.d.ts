import { GroupsService } from './groups.service';
import { CreateGroupDto, UpdateGroupDto, GroupResponseDto } from '../common/dtos';
export declare class GroupsController {
    private readonly groupsService;
    constructor(groupsService: GroupsService);
    findAll(phaseId?: string): Promise<GroupResponseDto[]>;
    findOne(id: number): Promise<GroupResponseDto>;
    create(createGroupDto: CreateGroupDto): Promise<GroupResponseDto>;
    update(id: number, updateGroupDto: UpdateGroupDto): Promise<GroupResponseDto>;
    remove(id: number): Promise<void>;
}
