"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentsModule = void 0;
const common_1 = require("@nestjs/common");
const api_module_1 = require("../api/api.module");
const matches_module_1 = require("../matches/matches.module");
const seasons_module_1 = require("../seasons/seasons.module");
const standings_module_1 = require("../standings/standings.module");
const agent_admin_service_1 = require("./agent-admin.service");
const agent_action_execution_service_1 = require("./agent-action-execution.service");
const agent_notification_service_1 = require("./agent-notification.service");
const agents_controller_1 = require("./agents.controller");
const agent_registry_service_1 = require("./agent-registry.service");
const agent_runner_service_1 = require("./agent-runner.service");
const agent_event_trigger_service_1 = require("./agent-event-trigger.service");
const agent_schedule_service_1 = require("./agent-schedule.service");
const dummy_agent_handler_1 = require("./dummy/dummy-agent.handler");
const season_results_updater_handler_1 = require("./season-results-updater/season-results-updater.handler");
const trigger_dispatcher_service_1 = require("./trigger-dispatcher.service");
const tokens_1 = require("./tokens");
let AgentsModule = class AgentsModule {
};
exports.AgentsModule = AgentsModule;
exports.AgentsModule = AgentsModule = __decorate([
    (0, common_1.Module)({
        imports: [api_module_1.ApiModule, seasons_module_1.SeasonsModule, matches_module_1.MatchesModule, standings_module_1.StandingsModule],
        controllers: [agents_controller_1.AgentsController],
        providers: [
            dummy_agent_handler_1.DummyAgentHandler,
            season_results_updater_handler_1.ScheduledSeasonResultsUpdaterHandler,
            {
                provide: tokens_1.AGENT_HANDLERS,
                useFactory: (dummyAgentHandler, scheduledSeasonResultsUpdaterHandler) => [dummyAgentHandler, scheduledSeasonResultsUpdaterHandler],
                inject: [dummy_agent_handler_1.DummyAgentHandler, season_results_updater_handler_1.ScheduledSeasonResultsUpdaterHandler],
            },
            {
                provide: tokens_1.AGENT_RUNTIME_LIFECYCLE_HOOKS,
                useFactory: (agentNotificationService) => [agentNotificationService],
                inject: [agent_notification_service_1.AgentNotificationService],
            },
            agent_admin_service_1.AgentAdminService,
            agent_action_execution_service_1.AgentActionExecutionService,
            agent_notification_service_1.AgentNotificationService,
            agent_registry_service_1.AgentRegistry,
            agent_runner_service_1.AgentRunner,
            trigger_dispatcher_service_1.TriggerDispatcher,
            agent_schedule_service_1.AgentScheduleService,
            agent_event_trigger_service_1.AgentEventTriggerService,
        ],
        exports: [
            agent_registry_service_1.AgentRegistry,
            agent_runner_service_1.AgentRunner,
            trigger_dispatcher_service_1.TriggerDispatcher,
            agent_admin_service_1.AgentAdminService,
            agent_action_execution_service_1.AgentActionExecutionService,
            agent_notification_service_1.AgentNotificationService,
            agent_schedule_service_1.AgentScheduleService,
            agent_event_trigger_service_1.AgentEventTriggerService,
            tokens_1.AGENT_HANDLERS,
            tokens_1.AGENT_RUNTIME_LIFECYCLE_HOOKS,
        ],
    })
], AgentsModule);
//# sourceMappingURL=agents.module.js.map