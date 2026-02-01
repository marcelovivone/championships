"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const groups_service_1 = require("./groups.service");
const create_group_dto_1 = require("./dto/create-group.dto");
const update_group_dto_1 = require("./dto/update-group.dto");
let GroupsController = class GroupsController {
    constructor(groupsService) {
        this.groupsService = groupsService;
    }
    async findAll(seasonId) {
        if (seasonId) {
            return this.groupsService.findBySeason(parseInt(seasonId, 10));
        }
        return this.groupsService.findAll();
    }
    async findOne(id) {
        return this.groupsService.findOne(id);
    }
    async create(createGroupDto) {
        return this.groupsService.create(createGroupDto);
    }
    async update(id, updateGroupDto) {
        return this.groupsService.update(id, updateGroupDto);
    }
    async remove(id) {
        await this.groupsService.remove(id);
    }
};
exports.GroupsController = GroupsController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve all groups' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of groups' }),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('seasonId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GroupsController.prototype, "findAll", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve a group by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The group details' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Group not found' }),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], GroupsController.prototype, "findOne", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Create a new group' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'The group has been successfully created.' }),
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_group_dto_1.CreateGroupDto]),
    __metadata("design:returntype", Promise)
], GroupsController.prototype, "create", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Update a group' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The group has been successfully updated.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Group not found' }),
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_group_dto_1.UpdateGroupDto]),
    __metadata("design:returntype", Promise)
], GroupsController.prototype, "update", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Delete a group' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'The group has been successfully deleted.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Group not found' }),
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], GroupsController.prototype, "remove", null);
exports.GroupsController = GroupsController = __decorate([
    (0, swagger_1.ApiTags)('groups'),
    (0, common_1.Controller)({ path: 'groups', version: '1' }),
    __metadata("design:paramtypes", [groups_service_1.GroupsService])
], GroupsController);
//# sourceMappingURL=groups.controller.js.map