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
var AgentRegistry_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentRegistry = void 0;
const common_1 = require("@nestjs/common");
const tokens_1 = require("./tokens");
let AgentRegistry = AgentRegistry_1 = class AgentRegistry {
    constructor(handlers) {
        this.logger = new common_1.Logger(AgentRegistry_1.name);
        this.handlers = new Map();
        handlers.forEach((handler) => this.register(handler));
    }
    register(handler) {
        if (this.handlers.has(handler.definition.agentKey)) {
            throw new Error(`Duplicate agent registration for key "${handler.definition.agentKey}"`);
        }
        this.handlers.set(handler.definition.agentKey, handler);
        this.logger.log(`Registered agent handler ${handler.definition.agentKey}`);
    }
    get(agentKey) {
        return this.handlers.get(agentKey) ?? null;
    }
    list() {
        return Array.from(this.handlers.values());
    }
};
exports.AgentRegistry = AgentRegistry;
exports.AgentRegistry = AgentRegistry = AgentRegistry_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(tokens_1.AGENT_HANDLERS)),
    __metadata("design:paramtypes", [Array])
], AgentRegistry);
//# sourceMappingURL=agent-registry.service.js.map