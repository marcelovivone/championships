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
exports.AgentEventTriggerService = void 0;
const common_1 = require("@nestjs/common");
const trigger_dispatcher_service_1 = require("./trigger-dispatcher.service");
let AgentEventTriggerService = class AgentEventTriggerService {
    constructor(triggerDispatcher) {
        this.triggerDispatcher = triggerDispatcher;
    }
    dispatch(agentKey, request) {
        return this.triggerDispatcher.dispatchEvent(agentKey, request.triggerSource, {
            mode: request.mode,
            initiatedBy: request.initiatedBy,
            identifiers: {
                idempotencyKey: request.idempotencyKey,
                correlationId: request.correlationId,
                requestId: request.requestId,
            },
            payload: request.payload,
            metadata: request.metadata,
        });
    }
};
exports.AgentEventTriggerService = AgentEventTriggerService;
exports.AgentEventTriggerService = AgentEventTriggerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [trigger_dispatcher_service_1.TriggerDispatcher])
], AgentEventTriggerService);
//# sourceMappingURL=agent-event-trigger.service.js.map