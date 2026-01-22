"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaguesModule = void 0;
const common_1 = require("@nestjs/common");
const leagues_service_1 = require("./leagues.service");
const leagues_controller_1 = require("./leagues.controller");
const db_module_1 = require("../db/db.module");
let LeaguesModule = class LeaguesModule {
};
exports.LeaguesModule = LeaguesModule;
exports.LeaguesModule = LeaguesModule = __decorate([
    (0, common_1.Module)({
        imports: [db_module_1.DbModule],
        controllers: [leagues_controller_1.LeaguesController],
        providers: [leagues_service_1.LeaguesService],
    })
], LeaguesModule);
//# sourceMappingURL=leagues.module.js.map