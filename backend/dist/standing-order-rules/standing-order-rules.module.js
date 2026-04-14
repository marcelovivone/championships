"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StandingOrderRulesModule = void 0;
const common_1 = require("@nestjs/common");
const standing_order_rules_service_1 = require("./standing-order-rules.service");
const standing_order_rules_controller_1 = require("./standing-order-rules.controller");
const db_module_1 = require("../db/db.module");
let StandingOrderRulesModule = class StandingOrderRulesModule {
};
exports.StandingOrderRulesModule = StandingOrderRulesModule;
exports.StandingOrderRulesModule = StandingOrderRulesModule = __decorate([
    (0, common_1.Module)({
        imports: [db_module_1.DbModule],
        controllers: [standing_order_rules_controller_1.StandingOrderRulesController],
        providers: [standing_order_rules_service_1.StandingOrderRulesService],
        exports: [standing_order_rules_service_1.StandingOrderRulesService],
    })
], StandingOrderRulesModule);
//# sourceMappingURL=standing-order-rules.module.js.map