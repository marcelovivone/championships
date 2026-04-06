import { Module } from '@nestjs/common';
import { StandingZonesService } from './standing-zones.service';
import { StandingZonesController } from './standing-zones.controller';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [StandingZonesController],
  providers: [StandingZonesService],
  exports: [StandingZonesService],
})
export class StandingZonesModule {}
