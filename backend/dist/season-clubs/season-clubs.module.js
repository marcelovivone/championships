"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeasonClubsModule = void 0;
const common_1 = require("@nestjs/common");
const season_clubs_service_1 = require("./season-clubs.service");
const season_clubs_controller_1 = require("./season-clubs.controller");
const db_module_1 = require("../db/db.module");
let SeasonClubsModule = class SeasonClubsModule {
};
exports.SeasonClubsModule = SeasonClubsModule;
exports.SeasonClubsModule = SeasonClubsModule = __decorate([
    (0, common_1.Module)({
        imports: [db_module_1.DbModule],
        controllers: [season_clubs_controller_1.SeasonClubsController],
        providers: [season_clubs_service_1.SeasonClubsService],
        exports: [season_clubs_service_1.SeasonClubsService],
    })
], SeasonClubsModule);
//# sourceMappingURL=season-clubs.module.js.map