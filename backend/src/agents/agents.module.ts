import { Module } from '@nestjs/common';
import { ApiModule } from '../api/api.module';
import { MatchesModule } from '../matches/matches.module';
import { SeasonsModule } from '../seasons/seasons.module';
import { StandingsModule } from '../standings/standings.module';
import { AgentAdminService } from './agent-admin.service';
import { AgentActionExecutionService } from './agent-action-execution.service';
import { AgentNotificationService } from './agent-notification.service';
import { AgentsController } from './agents.controller';
import { AgentRegistry } from './agent-registry.service';
import { AgentRunner } from './agent-runner.service';
import { AgentEventTriggerService } from './agent-event-trigger.service';
import { AgentScheduleService } from './agent-schedule.service';
import { DummyAgentHandler } from './dummy/dummy-agent.handler';
import { ScheduledSeasonResultsUpdaterHandler } from './season-results-updater/season-results-updater.handler';
import { TriggerDispatcher } from './trigger-dispatcher.service';
import { AGENT_HANDLERS, AGENT_RUNTIME_LIFECYCLE_HOOKS } from './tokens';

@Module({
  imports: [ApiModule, SeasonsModule, MatchesModule, StandingsModule],
  controllers: [AgentsController],
  providers: [
    DummyAgentHandler,
    ScheduledSeasonResultsUpdaterHandler,
    {
      provide: AGENT_HANDLERS,
      useFactory: (
        dummyAgentHandler: DummyAgentHandler,
        scheduledSeasonResultsUpdaterHandler: ScheduledSeasonResultsUpdaterHandler,
      ) => [dummyAgentHandler, scheduledSeasonResultsUpdaterHandler],
      inject: [DummyAgentHandler, ScheduledSeasonResultsUpdaterHandler],
    },
    {
      provide: AGENT_RUNTIME_LIFECYCLE_HOOKS,
      useFactory: (agentNotificationService: AgentNotificationService) => [agentNotificationService],
      inject: [AgentNotificationService],
    },
    AgentAdminService,
    AgentActionExecutionService,
    AgentNotificationService,
    AgentRegistry,
    AgentRunner,
    TriggerDispatcher,
    AgentScheduleService,
    AgentEventTriggerService,
  ],
  exports: [
    AgentRegistry,
    AgentRunner,
    TriggerDispatcher,
    AgentAdminService,
    AgentActionExecutionService,
    AgentNotificationService,
    AgentScheduleService,
    AgentEventTriggerService,
    AGENT_HANDLERS,
    AGENT_RUNTIME_LIFECYCLE_HOOKS,
  ],
})
export class AgentsModule {}