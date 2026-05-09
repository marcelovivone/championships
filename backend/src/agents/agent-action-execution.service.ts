import { Injectable } from '@nestjs/common';
import { ApiService } from '../api/api.service';

type SeasonResultsUpdaterExecutionPayload = {
  executor: 'scheduled-season-results-updater.apply-season-plan';
  transitionalId: number;
  sportId: number;
  leagueId: number;
  seasonId: number;
  seasonLabel: string;
  seasonPhase?: string;
  currentPhaseDetail?: string;
  expectedPlan?: Record<string, unknown>;
};

export interface AgentActionExecutionOutcome {
  status: 'approved' | 'executed' | 'failed';
  summary: string;
  resultPayload?: unknown;
  errorCode?: string;
  errorMessage?: string;
}

@Injectable()
export class AgentActionExecutionService {
  constructor(private readonly apiService: ApiService) {}

  async executeApprovedAction(input: {
    agentKey: string;
    actionKey: string;
    actionPayload: unknown;
    summary: string;
  }): Promise<AgentActionExecutionOutcome> {
    if (input.agentKey !== 'scheduled-season-results-updater') {
      return {
        status: 'approved',
        summary: `Approval recorded for ${input.actionKey}. No executor is registered for ${input.agentKey}.`,
      };
    }

    return this.executeSeasonResultsUpdaterAction(input.actionKey, input.actionPayload);
  }

  private async executeSeasonResultsUpdaterAction(
    actionKey: string,
    actionPayload: unknown,
  ): Promise<AgentActionExecutionOutcome> {
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
        await this.apiService.failApplyJob(
          payload.transitionalId,
          normalizedError ?? `applyAllRowsToApp returned reason ${normalizedReason}.`,
        );

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
    } catch (error) {
      await this.apiService.failApplyJob(
        payload.transitionalId,
        error instanceof Error ? error.message : 'Unknown action execution failure',
      );

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

  private asSeasonResultsUpdaterExecutionPayload(value: unknown): SeasonResultsUpdaterExecutionPayload | null {
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

    if (
      executor !== 'scheduled-season-results-updater.apply-season-plan' ||
      !Number.isInteger(transitionalId) ||
      transitionalId <= 0 ||
      !Number.isInteger(sportId) ||
      sportId <= 0 ||
      !Number.isInteger(leagueId) ||
      leagueId <= 0 ||
      !Number.isInteger(seasonId) ||
      seasonId <= 0 ||
      !seasonLabel
    ) {
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

  private isObject(value: unknown): value is Record<string, any> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}