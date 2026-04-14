"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StandingsModule = void 0;
const common_1 = require("@nestjs/common");
const standings_service_1 = require("./standings.service");
const standings_controller_1 = require("./standings.controller");
const db_module_1 = require("../db/db.module");
const standings_calculator_service_1 = require("./standings-calculator.service");
const tiebreaker_engine_1 = require("./tiebreaker.engine");
const h2h_calculator_1 = require("./h2h-calculator");
const standing_order_rules_module_1 = require("../standing-order-rules/standing-order-rules.module");
let StandingsModule = class StandingsModule {
};
exports.StandingsModule = StandingsModule;
exports.StandingsModule = StandingsModule = __decorate([
    (0, common_1.Module)({
        imports: [db_module_1.DbModule, standing_order_rules_module_1.StandingOrderRulesModule],
        controllers: [standings_controller_1.StandingsController],
        providers: [standings_service_1.StandingsService, standings_calculator_service_1.StandingsCalculatorService, tiebreaker_engine_1.TiebreakerEngine, h2h_calculator_1.H2HCalculator],
        exports: [standings_service_1.StandingsService, standings_calculator_service_1.StandingsCalculatorService],
    })
], StandingsModule);
//# sourceMappingURL=standings.module.js.map