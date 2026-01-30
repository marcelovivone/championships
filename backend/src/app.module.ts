import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { CountriesModule } from './countries/countries.module';
import { SportsModule } from './sports/sports.module';
import { CitiesModule } from './cities/cities.module';
import { ClubsModule } from './clubs/clubs.module';
import { ClubStadiumsModule } from './club-stadiums/club-stadiums.module';
import { StadiumsModule } from './stadiums/stadiums.module';
import { LeaguesModule } from './leagues/leagues.module';
import { SeasonsModule } from './seasons/seasons.module';
import { SeasonClubsModule } from './season-clubs/season-clubs.module';
import { SportClubsModule } from './sport-clubs/sport-clubs.module';
import { GroupsModule } from './groups/groups.module';
import { RoundsModule } from './rounds/rounds.module';
import { MatchDivisionsModule } from './match-divisions/match-divisions.module';
import { MatchEventsModule } from './match-events/match-events.module';
import { StandingsModule } from './standings/standings.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MenuItemsModule } from './menu-items/menu-items.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 20,
    }]),
    DbModule, 
    CountriesModule, 
    SportsModule,
    CitiesModule,
    ClubsModule,
    ClubStadiumsModule,
    StadiumsModule,
    LeaguesModule,
    SeasonsModule,
    SeasonClubsModule,
    SportClubsModule,
    GroupsModule,
    RoundsModule,
    MatchDivisionsModule,
    MatchEventsModule,
    StandingsModule,
    UsersModule,
    AuthModule,
    MenuItemsModule,
    PermissionsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}