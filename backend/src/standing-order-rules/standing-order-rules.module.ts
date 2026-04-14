import { Module } from '@nestjs/common';
import { StandingOrderRulesService } from './standing-order-rules.service';
import { StandingOrderRulesController } from './standing-order-rules.controller';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [StandingOrderRulesController],
  providers: [StandingOrderRulesService],
  exports: [StandingOrderRulesService],
})
export class StandingOrderRulesModule {}
