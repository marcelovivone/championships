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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentActionExecutionService = void 0;
const common_1 = require("@nestjs/common");
const api_service_1 = require("../api/api.service");
let AgentActionExecutionService = class AgentActionExecutionService {
    constructor(apiService) {
        this.apiService = apiService;
    }
    async executeApprovedAction(input) {
        if (input.agentKey !== 'scheduled-season-results-updater') {
            return {
                status: 'approved',
                summary: `Approval recorded for ${input.actionKey}. No executor is registered for ${input.agentKey}.`,
            };
        }
        return this.executeSeasonResultsUpdaterAction(input.actionKey, input.actionPayload);
    }
    async executeSeasonResultsUpdaterAction(actionKey, actionPayload) {
        const payload = this.asSeasonResultsUpdaterExecutionPayload(actionPayload);
        if (!payload) {
            return {
                status: 'failed',
                summary: `Approved action ${actionKey} could not be executed because its payload is invalid.`,
                errorCode: 'AGENT_ACTION_EXECUTION_INVALID_PAYLOAD',
                errorMessage: `Action ${actionKey} is missing a valid season updater execution payload.`,
                resultPayload: { actionKey, actionPayload },
            };
        }
        try {
            await this.apiService.startApplyJob(payload.transitionalId);
            const result = await this.apiService.applyAllRowsToApp(payload.transitionalId, {
                sportId: payload.sportId,
                leagueId: payload.leagueId,
                seasonId: payload.seasonId,
                dryRun: false,
                seasonPhase: payload.seasonPhase,
            });
            const normalizedReason = typeof result?.reason === 'string' ? result.reason : null;
            const normalizedError = typeof result?.error === 'string' ? result.error : null;
            const resultPayload = {
                request: {
                    transitionalId: payload.transitionalId,
                    sportId: payload.sportId,
                    leagueId: payload.leagueId,
                    seasonId: payload.seasonId,
                    seasonLabel: payload.seasonLabel,
                    seasonPhase: payload.seasonPhase ?? null,
                    currentPhaseDetail: payload.currentPhaseDetail ?? null,
                },
                result,
            };
            if (normalizedReason || normalizedError) {
                await this.apiService.failApplyJob(payload.transitionalId, normalizedError ?? `applyAllRowsToApp returned reason ${normalizedReason}.`);
                return {
                    status: 'failed',
                    summary: `Approved action ${actionKey} failed while applying staged results for ${payload.seasonLabel}.`,
                    errorCode: 'AGENT_ACTION_EXECUTION_FAILED',
                    errorMessage: normalizedError ?? `applyAllRowsToApp returned reason ${normalizedReason}.`,
                    resultPayload,
                };
            }
            await this.apiService.finishApplyJob(payload.transitionalId, result);
            return {
                status: 'executed',
                summary: `Applied staged results for ${payload.seasonLabel}.`,
                resultPayload,
            };
        }
        catch (error) {
            await this.apiService.failApplyJob(payload.transitionalId, error instanceof Error ? error.message : 'Unknown action execution failure');
            return {
                status: 'failed',
                summary: `Approved action ${actionKey} threw while applying staged results for ${payload.seasonLabel}.`,
                errorCode: 'AGENT_ACTION_EXECUTION_FAILED',
                errorMessage: error instanceof Error ? error.message : 'Unknown action execution failure',
                resultPayload: {
                    request: {
                        transitionalId: payload.transitionalId,
                        sportId: payload.sportId,
                        leagueId: payload.leagueId,
                        seasonId: payload.seasonId,
                        seasonLabel: payload.seasonLabel,
                        seasonPhase: payload.seasonPhase ?? null,
                        currentPhaseDetail: payload.currentPhaseDetail ?? null,
                    },
                },
            };
        }
    }
    asSeasonResultsUpdaterExecutionPayload(value) {
        if (!this.isObject(value)) {
            return null;
        }
        const executor = value.executor;
        const transitionalId = Number(value.transitionalId);
        const sportId = Number(value.sportId);
        const leagueId = Number(value.leagueId);
        const seasonId = Number(value.seasonId);
        const seasonLabel = typeof value.seasonLabel === 'string' ? value.seasonLabel : null;
        const seasonPhase = typeof value.seasonPhase === 'string' && value.seasonPhase.trim().length > 0
            ? value.seasonPhase.trim()
            : undefined;
        const currentPhaseDetail = typeof value.currentPhaseDetail === 'string' && value.currentPhaseDetail.trim().length > 0
            ? value.currentPhaseDetail.trim()
            : undefined;
        if (executor !== 'scheduled-season-results-updater.apply-season-plan' ||
            !Number.isInteger(transitionalId) ||
            transitionalId <= 0 ||
            !Number.isInteger(sportId) ||
            sportId <= 0 ||
            !Number.isInteger(leagueId) ||
            leagueId <= 0 ||
            !Number.isInteger(seasonId) ||
            seasonId <= 0 ||
            !seasonLabel) {
            return null;
        }
        return {
            executor,
            transitionalId,
            sportId,
            leagueId,
            seasonId,
            seasonLabel,
            seasonPhase,
            currentPhaseDetail,
            expectedPlan: this.isObject(value.expectedPlan) ? value.expectedPlan : undefined,
        };
    }
    isObject(value) {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }
};
exports.AgentActionExecutionService = AgentActionExecutionService;
exports.AgentActionExecutionService = AgentActionExecutionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [api_service_1.ApiService])
], AgentActionExecutionService);
//# sourceMappingURL=agent-action-execution.service.js.map