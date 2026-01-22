import { Module } from '@nestjs/common';
import { StandingsService } from './standings.service';
import { StandingsController } from './standings.controller';
import { DbModule } from '../db/db.module';
import { StandingsCalculatorService } from './standings-calculator.service';

@Module({
  imports: [DbModule],
  controllers: [StandingsController],
  providers: [StandingsService, StandingsCalculatorService],
  exports: [StandingsService, StandingsCalculatorService],
})
export class StandingsModule {}