import { Module } from '@nestjs/common';
import { StandingsService } from './standings.service';
import { StandingsController } from './standings.controller';
import { DbModule } from '../db/db.module';
import { StandingsCalculatorService } from './standings-calculator.service';
import { TiebreakerEngine } from './tiebreaker.engine';
import { H2HCalculator } from './h2h-calculator';
import { StandingOrderRulesModule } from '../standing-order-rules/standing-order-rules.module';

@Module({
  imports: [DbModule, StandingOrderRulesModule],
  controllers: [StandingsController],
  providers: [StandingsService, StandingsCalculatorService, TiebreakerEngine, H2HCalculator],
  exports: [StandingsService, StandingsCalculatorService],
})
export class StandingsModule {}