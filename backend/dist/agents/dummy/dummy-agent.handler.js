"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DummyAgentHandler = void 0;
const common_1 = require("@nestjs/common");
let DummyAgentHandler = class DummyAgentHandler {
    constructor() {
        this.definition = {
            agentKey: 'dummy-agent',
            name: 'Dummy Agent',
            description: 'A runtime smoke-test agent used to validate the shared agent pipeline.',
            defaultMode: 'dry-run',
            supportsManualTrigger: true,
            supportsSchedule: true,
            supportsEventTrigger: true,
        };
    }
    async run(context) {
        return {
            status: 'completed',
            summary: `Dummy agent executed in ${context.mode} mode via ${context.triggerType}`,
            actions: [
                {
                    actionKey: 'dummy-read-health-check',
                    kind: 'read',
                    writeDisposition: 'read-only',
                    summary: 'Recorded a runtime smoke-check action without mutating application state.',
                    payload: {
                        triggerSource: context.triggerSource,
                        initiatedBy: context.initiatedBy ?? null,
                    },
                },
            ],
            warnings: context.payload ? undefined : [{ code: 'DUMMY_NO_PAYLOAD', message: 'Dummy agent executed without an input payload.' }],
            metrics: {
                readCount: 1,
                actionCount: 1,
                warningCount: context.payload ? 0 : 1,
                errorCount: 0,
            },
            result: {
                echoedPayload: context.payload ?? null,
                metadata: context.metadata ?? null,
            },
        };
    }
};
exports.DummyAgentHandler = DummyAgentHandler;
exports.DummyAgentHandler = DummyAgentHandler = __decorate([
    (0, common_1.Injectable)()
], DummyAgentHandler);
//# sourceMappingURL=dummy-agent.handler.js.map