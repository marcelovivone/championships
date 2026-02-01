"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SportClubsModule = void 0;
const common_1 = require("@nestjs/common");
const sport_clubs_controller_1 = require("./sport-clubs.controller");
const sport_clubs_service_1 = require("./sport-clubs.service");
const db_module_1 = require("../db/db.module");
let SportClubsModule = class SportClubsModule {
};
exports.SportClubsModule = SportClubsModule;
exports.SportClubsModule = SportClubsModule = __decorate([
    (0, common_1.Module)({
        imports: [db_module_1.DbModule],
        controllers: [sport_clubs_controller_1.SportClubsController],
        providers: [sport_clubs_service_1.SportClubsService],
        exports: [sport_clubs_service_1.SportClubsService],
    })
], SportClubsModule);
//# sourceMappingURL=sport-clubs.module.js.map