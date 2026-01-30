import { Module } from '@nestjs/common';
import { RoundsService } from './rounds.service';
import { RoundsController } from './rounds.controller';
import { RoundAutoUpdateService } from './round-auto-update.service';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [RoundsController],
  providers: [RoundsService, RoundAutoUpdateService],
  exports: [RoundsService, RoundAutoUpdateService],
})
export class RoundsModule {}
