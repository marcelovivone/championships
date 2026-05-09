import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { AgentAdminService, ApprovalDecisionInput } from './agent-admin.service';
import { AgentEventTriggerService } from './agent-event-trigger.service';
import {
  AGENT_APPROVAL_STATUSES,
  AGENT_EXECUTION_MODES,
  AGENT_RUN_STATUSES,
  AGENT_TRIGGER_TYPES,
  AgentApprovalStatus,
  AgentExecutionMode,
  AgentRunStatus,
  AgentTriggerType,
} from './contracts';
import { AgentScheduleService } from './agent-schedule.service';
import { TriggerDispatcher } from './trigger-dispatcher.service';

class AgentTriggerBaseDto {
  @IsOptional()
  @IsIn(AGENT_EXECUTION_MODES)
  mode?: AgentExecutionMode;

  @IsOptional()
  @IsString()
  initiatedBy?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  correlationId?: string;

  @IsOptional()
  @IsString()
  requestId?: string;

  @IsOptional()
  payload?: unknown;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

class ManualAgentTriggerDto extends AgentTriggerBaseDto {
  @IsOptional()
  @IsString()
  triggerSource?: string;
}

class ScheduledAgentTriggerDto extends AgentTriggerBaseDto {
  @IsOptional()
  @IsString()
  triggerSource?: string;
}

class EventAgentTriggerDto extends AgentTriggerBaseDto {
  @IsString()
  triggerSource!: string;
}

class UpdateAgentConfigDto {
  @IsBoolean()
  isEnabled!: boolean;

  @IsIn(AGENT_EXECUTION_MODES)
  mode!: AgentExecutionMode;

  @IsOptional()
  @IsString()
  scheduleExpression?: string;

  @IsInt()
  @Min(1)
  timeoutSeconds!: number;

  @IsInt()
  @Min(0)
  maxRetries!: number;

  @IsBoolean()
  approvalRequiredForWrites!: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notificationRecipients?: string[];
}

class ApprovalDecisionDto implements ApprovalDecisionInput {
  @IsOptional()
  @IsInt()
  @Min(1)
  decidedByUserId?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

@ApiTags('Agents')
@Controller({ path: 'admin/agents', version: '1' })
export class AgentsController {
  constructor(
    private readonly agentAdminService: AgentAdminService,
    private readonly triggerDispatcher: TriggerDispatcher,
    private readonly agentScheduleService: AgentScheduleService,
    private readonly agentEventTriggerService: AgentEventTriggerService,
  ) {}

  @ApiOperation({ summary: 'List registered backend agents and current schedule status' })
  @Get()
  async listAgents() {
    return this.agentAdminService.listAgentSetups();
  }

  @ApiOperation({ summary: 'List run history with agent, status, and trigger filters' })
  @Get('console/runs')
  async listRuns(
    @Query('agentKey') agentKey?: string,
    @Query('status') status?: AgentRunStatus,
    @Query('triggerType') triggerType?: AgentTriggerType,
    @Query('limit') limit?: string,
  ) {
    return this.agentAdminService.listRunHistory({
      agentKey,
      status: status && AGENT_RUN_STATUSES.includes(status) ? status : undefined,
      triggerType: triggerType && AGENT_TRIGGER_TYPES.includes(triggerType) ? triggerType : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @ApiOperation({ summary: 'Get run detail with action logs, approvals, warnings, and notifications' })
  @Get('console/runs/:runId')
  async getRunDetail(@Param('runId', ParseIntPipe) runId: number) {
    return this.agentAdminService.getRunDetail(runId);
  }

  @ApiOperation({ summary: 'List approvals for the agent approval queue' })
  @Get('console/approvals')
  async listApprovals(
    @Query('agentKey') agentKey?: string,
    @Query('status') status?: AgentApprovalStatus,
    @Query('limit') limit?: string,
  ) {
    return this.agentAdminService.listApprovals({
      agentKey,
      status: status && AGENT_APPROVAL_STATUSES.includes(status) ? status : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @ApiOperation({ summary: 'Approve a pending approval-queue item' })
  @Post('console/approvals/:approvalId/approve')
  @HttpCode(HttpStatus.OK)
  async approveApproval(@Param('approvalId', ParseIntPipe) approvalId: number, @Body() dto: ApprovalDecisionDto) {
    return this.agentAdminService.approveApproval(approvalId, dto);
  }

  @ApiOperation({ summary: 'Reject a pending approval-queue item' })
  @Post('console/approvals/:approvalId/reject')
  @HttpCode(HttpStatus.OK)
  async rejectApproval(@Param('approvalId', ParseIntPipe) approvalId: number, @Body() dto: ApprovalDecisionDto) {
    return this.agentAdminService.rejectApproval(approvalId, dto);
  }

  @ApiOperation({ summary: 'Get detail and configuration data for one agent' })
  @Get(':agentKey')
  async getAgent(@Param('agentKey') agentKey: string) {
    return this.agentAdminService.getAgentSetup(agentKey);
  }

  @ApiOperation({ summary: 'Create or update the latest saved configuration for an agent' })
  @Put(':agentKey/config')
  @HttpCode(HttpStatus.OK)
  async updateAgentConfig(@Param('agentKey') agentKey: string, @Body() dto: UpdateAgentConfigDto) {
    return this.agentAdminService.saveAgentSetup(agentKey, dto);
  }

  @ApiOperation({ summary: 'Trigger an agent manually through the shared runtime pipeline' })
  @Post(':agentKey/trigger/manual')
  @HttpCode(HttpStatus.OK)
  async triggerManual(@Param('agentKey') agentKey: string, @Body() dto: ManualAgentTriggerDto) {
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

  @ApiOperation({ summary: 'Trigger an agent via the scheduled path without waiting for cron' })
  @Post(':agentKey/trigger/schedule')
  @HttpCode(HttpStatus.OK)
  async triggerScheduled(@Param('agentKey') agentKey: string, @Body() dto: ScheduledAgentTriggerDto) {
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

  @ApiOperation({ summary: 'Trigger an agent via the event path for ETL or lifecycle integration testing' })
  @Post(':agentKey/trigger/event')
  @HttpCode(HttpStatus.OK)
  async triggerEvent(@Param('agentKey') agentKey: string, @Body() dto: EventAgentTriggerDto) {
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

  @ApiOperation({ summary: 'Reload cron-backed scheduled agent jobs from the database configuration' })
  @Post('schedules/reload')
  @HttpCode(HttpStatus.OK)
  async reloadSchedules() {
    return this.agentScheduleService.reloadSchedules();
  }
}