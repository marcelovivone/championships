"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeasonsModule = void 0;
const common_1 = require("@nestjs/common");
const seasons_controller_1 = require("./seasons.controller");
const seasons_service_1 = require("./seasons.service");
const db_module_1 = require("../db/db.module");
let SeasonsModule = class SeasonsModule {
};
exports.SeasonsModule = SeasonsModule;
exports.SeasonsModule = SeasonsModule = __decorate([
    (0, common_1.Module)({
        imports: [db_module_1.DbModule],
        controllers: [seasons_controller_1.SeasonsController],
        providers: [seasons_service_1.SeasonsService],
        exports: [seasons_service_1.SeasonsService],
    })
], SeasonsModule);
//# sourceMappingURL=seasons.module.js.map