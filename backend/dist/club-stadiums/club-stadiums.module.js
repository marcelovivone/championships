"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClubStadiumsModule = void 0;
const common_1 = require("@nestjs/common");
const club_stadiums_service_1 = require("./club-stadiums.service");
const club_stadiums_controller_1 = require("./club-stadiums.controller");
const db_module_1 = require("../db/db.module");
let ClubStadiumsModule = class ClubStadiumsModule {
};
exports.ClubStadiumsModule = ClubStadiumsModule;
exports.ClubStadiumsModule = ClubStadiumsModule = __decorate([
    (0, common_1.Module)({
        imports: [db_module_1.DbModule],
        controllers: [club_stadiums_controller_1.ClubStadiumsController],
        providers: [club_stadiums_service_1.ClubStadiumsService],
        exports: [club_stadiums_service_1.ClubStadiumsService],
    })
], ClubStadiumsModule);
//# sourceMappingURL=club-stadiums.module.js.map