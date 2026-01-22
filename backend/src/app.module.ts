import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { CountriesModule } from './countries/countries.module';
import { SportsModule } from './sports/sports.module';
import { CitiesModule } from './cities/cities.module';
import { ClubsModule } from './clubs/clubs.module';
import { StadiumsModule } from './stadiums/stadiums.module';
import { LeaguesModule } from './leagues/leagues.module';
import { SeasonClubsModule } from './season-clubs/season-clubs.module';
import { PhasesModule } from './phases/phases.module';
import { GroupsModule } from './groups/groups.module';
import { MatchesModule } from './matches/matches.module';
import { MatchDivisionsModule } from './match-divisions/match-divisions.module';
import { MatchEventsModule } from './match-events/match-events.module';
import { StandingsModule } from './standings/standings.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
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
    StadiumsModule,
    LeaguesModule,
    SeasonClubsModule,
    PhasesModule,
    GroupsModule,
    MatchesModule,
    MatchDivisionsModule,
    MatchEventsModule,
    StandingsModule,
    UsersModule,
    AuthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}