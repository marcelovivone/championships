"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchDivisionsModule = void 0;
const common_1 = require("@nestjs/common");
const match_divisions_service_1 = require("./match-divisions.service");
const match_divisions_controller_1 = require("./match-divisions.controller");
const db_module_1 = require("../db/db.module");
let MatchDivisionsModule = class MatchDivisionsModule {
};
exports.MatchDivisionsModule = MatchDivisionsModule;
exports.MatchDivisionsModule = MatchDivisionsModule = __decorate([
    (0, common_1.Module)({
        imports: [db_module_1.DbModule],
        controllers: [match_divisions_controller_1.MatchDivisionsController],
        providers: [match_divisions_service_1.MatchDivisionsService],
        exports: [match_divisions_service_1.MatchDivisionsService],
    })
], MatchDivisionsModule);
//# sourceMappingURL=match-divisions.module.js.map