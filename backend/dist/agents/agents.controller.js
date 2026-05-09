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
exports.AgentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const agent_admin_service_1 = require("./agent-admin.service");
const agent_event_trigger_service_1 = require("./agent-event-trigger.service");
const contracts_1 = require("./contracts");
const agent_schedule_service_1 = require("./agent-schedule.service");
const trigger_dispatcher_service_1 = require("./trigger-dispatcher.service");
class AgentTriggerBaseDto {
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(contracts_1.AGENT_EXECUTION_MODES),
    __metadata("design:type", String)
], AgentTriggerBaseDto.prototype, "mode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AgentTriggerBaseDto.prototype, "initiatedBy", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AgentTriggerBaseDto.prototype, "idempotencyKey", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AgentTriggerBaseDto.prototype, "correlationId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AgentTriggerBaseDto.prototype, "requestId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], AgentTriggerBaseDto.prototype, "payload", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], AgentTriggerBaseDto.prototype, "metadata", void 0);
class ManualAgentTriggerDto extends AgentTriggerBaseDto {
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ManualAgentTriggerDto.prototype, "triggerSource", void 0);
class ScheduledAgentTriggerDto extends AgentTriggerBaseDto {
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScheduledAgentTriggerDto.prototype, "triggerSource", void 0);
class EventAgentTriggerDto extends AgentTriggerBaseDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EventAgentTriggerDto.prototype, "triggerSource", void 0);
class UpdateAgentConfigDto {
}
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateAgentConfigDto.prototype, "isEnabled", void 0);
__decorate([
    (0, class_validator_1.IsIn)(contracts_1.AGENT_EXECUTION_MODES),
    __metadata("design:type", String)
], UpdateAgentConfigDto.prototype, "mode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAgentConfigDto.prototype, "scheduleExpression", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], UpdateAgentConfigDto.prototype, "timeoutSeconds", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateAgentConfigDto.prototype, "maxRetries", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateAgentConfigDto.prototype, "approvalRequiredForWrites", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UpdateAgentConfigDto.prototype, "notificationRecipients", void 0);
class ApprovalDecisionDto {
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], ApprovalDecisionDto.prototype, "decidedByUserId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ApprovalDecisionDto.prototype, "note", void 0);
let AgentsController = class AgentsController {
    constructor(agentAdminService, triggerDispatcher, agentScheduleService, agentEventTriggerService) {
        this.agentAdminService = agentAdminService;
        this.triggerDispatcher = triggerDispatcher;
        this.agentScheduleService = agentScheduleService;
        this.agentEventTriggerService = agentEventTriggerService;
    }
    async listAgents() {
        return this.agentAdminService.listAgentSetups();
    }
    async listRuns(agentKey, status, triggerType, limit) {
        return this.agentAdminService.listRunHistory({
            agentKey,
            status: status && contracts_1.AGENT_RUN_STATUSES.includes(status) ? status : undefined,
            triggerType: triggerType && contracts_1.AGENT_TRIGGER_TYPES.includes(triggerType) ? triggerType : undefined,
            limit: limit ? Number(limit) : undefined,
        });
    }
    async getRunDetail(runId) {
        return this.agentAdminService.getRunDetail(runId);
    }
    async listApprovals(agentKey, status, limit) {
        return this.agentAdminService.listApprovals({
            agentKey,
            status: status && contracts_1.AGENT_APPROVAL_STATUSES.includes(status) ? status : undefined,
            limit: limit ? Number(limit) : undefined,
        });
    }
    async approveApproval(approvalId, dto) {
        return this.agentAdminService.approveApproval(approvalId, dto);
    }
    async rejectApproval(approvalId, dto) {
        return this.agentAdminService.rejectApproval(approvalId, dto);
    }
    async getAgent(agentKey) {
        return this.agentAdminService.getAgentSetup(agentKey);
    }
    async updateAgentConfig(agentKey, dto) {
        return this.agentAdminService.saveAgentSetup(agentKey, dto);
    }
    async triggerManual(agentKey, dto) {
        return this.triggerDispatcher.dispatchManual(agentKey, {
            mode: dto.mode,
            triggerSource: dto.triggerSource ?? 'admin-manual',
            initiatedBy: dto.initiatedBy,
            identifiers: {
                idempotencyKey: dto.idempotencyKey,
                correlationId: dto.correlationId,
                requestId: dto.requestId,
            },
            payload: dto.payload,
            metadata: dto.metadata,
        });
    }
    async triggerScheduled(agentKey, dto) {
        return this.agentScheduleService.dispatchScheduledAgent(agentKey, {
            triggerSource: dto.triggerSource,
            mode: dto.mode,
            initiatedBy: dto.initiatedBy,
            idempotencyKey: dto.idempotencyKey,
            correlationId: dto.correlationId,
            requestId: dto.requestId,
            payload: dto.payload,
            metadata: dto.metadata,
        });
    }
    async triggerEvent(agentKey, dto) {
        return this.agentEventTriggerService.dispatch(agentKey, {
            triggerSource: dto.triggerSource,
            mode: dto.mode,
            initiatedBy: dto.initiatedBy,
            idempotencyKey: dto.idempotencyKey,
            correlationId: dto.correlationId,
            requestId: dto.requestId,
            payload: dto.payload,
            metadata: dto.metadata,
        });
    }
    async reloadSchedules() {
        return this.agentScheduleService.reloadSchedules();
    }
};
exports.AgentsController = AgentsController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'List registered backend agents and current schedule status' }),
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "listAgents", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'List run history with agent, status, and trigger filters' }),
    (0, common_1.Get)('console/runs'),
    __param(0, (0, common_1.Query)('agentKey')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('triggerType')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "listRuns", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get run detail with action logs, approvals, warnings, and notifications' }),
    (0, common_1.Get)('console/runs/:runId'),
    __param(0, (0, common_1.Param)('runId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "getRunDetail", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'List approvals for the agent approval queue' }),
    (0, common_1.Get)('console/approvals'),
    __param(0, (0, common_1.Query)('agentKey')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "listApprovals", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Approve a pending approval-queue item' }),
    (0, common_1.Post)('console/approvals/:approvalId/approve'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('approvalId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, ApprovalDecisionDto]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "approveApproval", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Reject a pending approval-queue item' }),
    (0, common_1.Post)('console/approvals/:approvalId/reject'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('approvalId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, ApprovalDecisionDto]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "rejectApproval", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get detail and configuration data for one agent' }),
    (0, common_1.Get)(':agentKey'),
    __param(0, (0, common_1.Param)('agentKey')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "getAgent", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Create or update the latest saved configuration for an agent' }),
    (0, common_1.Put)(':agentKey/config'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('agentKey')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateAgentConfigDto]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "updateAgentConfig", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Trigger an agent manually through the shared runtime pipeline' }),
    (0, common_1.Post)(':agentKey/trigger/manual'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('agentKey')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ManualAgentTriggerDto]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "triggerManual", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Trigger an agent via the scheduled path without waiting for cron' }),
    (0, common_1.Post)(':agentKey/trigger/schedule'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('agentKey')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ScheduledAgentTriggerDto]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "triggerScheduled", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Trigger an agent via the event path for ETL or lifecycle integration testing' }),
    (0, common_1.Post)(':agentKey/trigger/event'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('agentKey')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, EventAgentTriggerDto]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "triggerEvent", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Reload cron-backed scheduled agent jobs from the database configuration' }),
    (0, common_1.Post)('schedules/reload'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "reloadSchedules", null);
exports.AgentsController = AgentsController = __decorate([
    (0, swagger_1.ApiTags)('Agents'),
    (0, common_1.Controller)({ path: 'admin/agents', version: '1' }),
    __metadata("design:paramtypes", [agent_admin_service_1.AgentAdminService,
        trigger_dispatcher_service_1.TriggerDispatcher,
        agent_schedule_service_1.AgentScheduleService,
        agent_event_trigger_service_1.AgentEventTriggerService])
], AgentsController);
//# sourceMappingURL=agents.controller.js.map