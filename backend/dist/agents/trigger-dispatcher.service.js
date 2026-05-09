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
exports.TriggerDispatcher = void 0;
const common_1 = require("@nestjs/common");
const agent_runner_service_1 = require("./agent-runner.service");
let TriggerDispatcher = class TriggerDispatcher {
    constructor(agentRunner) {
        this.agentRunner = agentRunner;
    }
    dispatch(request) {
        return this.agentRunner.run(request);
    }
    dispatchManual(agentKey, request) {
        return this.agentRunner.run({
            ...request,
            agentKey,
            triggerType: 'manual',
        });
    }
    dispatchScheduled(agentKey, triggerSource, request) {
        return this.agentRunner.run({
            ...request,
            agentKey,
            triggerType: 'schedule',
            triggerSource,
        });
    }
    dispatchEvent(agentKey, triggerSource, request) {
        return this.agentRunner.run({
            ...request,
            agentKey,
            triggerType: 'event',
            triggerSource,
        });
    }
};
exports.TriggerDispatcher = TriggerDispatcher;
exports.TriggerDispatcher = TriggerDispatcher = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [agent_runner_service_1.AgentRunner])
], TriggerDispatcher);
//# sourceMappingURL=trigger-dispatcher.service.js.map