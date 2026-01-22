"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StadiumsModule = void 0;
const common_1 = require("@nestjs/common");
const stadiums_service_1 = require("./stadiums.service");
const stadiums_controller_1 = require("./stadiums.controller");
const db_module_1 = require("../db/db.module");
let StadiumsModule = class StadiumsModule {
};
exports.StadiumsModule = StadiumsModule;
exports.StadiumsModule = StadiumsModule = __decorate([
    (0, common_1.Module)({
        imports: [db_module_1.DbModule],
        controllers: [stadiums_controller_1.StadiumsController],
        providers: [stadiums_service_1.StadiumsService],
        exports: [stadiums_service_1.StadiumsService],
    })
], StadiumsModule);
//# sourceMappingURL=stadiums.module.js.map