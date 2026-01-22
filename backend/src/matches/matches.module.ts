import { Module } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { MatchesController } from './matches.controller';
import { DbModule } from '../db/db.module';
import { StandingsModule } from '../standings/standings.module';

@Module({
  imports: [
    DbModule, 
    StandingsModule
  ],
  controllers: [MatchesController],
  providers: [MatchesService],
})
export class MatchesModule {}