"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const db_module_1 = require("./db/db.module");
const countries_module_1 = require("./countries/countries.module");
const sports_module_1 = require("./sports/sports.module");
const cities_module_1 = require("./cities/cities.module");
const clubs_module_1 = require("./clubs/clubs.module");
const stadiums_module_1 = require("./stadiums/stadiums.module");
const leagues_module_1 = require("./leagues/leagues.module");
const season_clubs_module_1 = require("./season-clubs/season-clubs.module");
const phases_module_1 = require("./phases/phases.module");
const groups_module_1 = require("./groups/groups.module");
const matches_module_1 = require("./matches/matches.module");
const match_divisions_module_1 = require("./match-divisions/match-divisions.module");
const match_events_module_1 = require("./match-events/match-events.module");
const standings_module_1 = require("./standings/standings.module");
const users_module_1 = require("./users/users.module");
const auth_module_1 = require("./auth/auth.module");
const throttler_1 = require("@nestjs/throttler");
const core_1 = require("@nestjs/core");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            throttler_1.ThrottlerModule.forRoot([{
                    ttl: 60000,
                    limit: 20,
                }]),
            db_module_1.DbModule,
            countries_module_1.CountriesModule,
            sports_module_1.SportsModule,
            cities_module_1.CitiesModule,
            clubs_module_1.ClubsModule,
            stadiums_module_1.StadiumsModule,
            leagues_module_1.LeaguesModule,
            season_clubs_module_1.SeasonClubsModule,
            phases_module_1.PhasesModule,
            groups_module_1.GroupsModule,
            matches_module_1.MatchesModule,
            match_divisions_module_1.MatchDivisionsModule,
            match_events_module_1.MatchEventsModule,
            standings_module_1.StandingsModule,
            users_module_1.UsersModule,
            auth_module_1.AuthModule,
        ],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map