import { Module } from '@nestjs/common';
import { MatchDivisionsService } from './match-divisions.service';
import { MatchDivisionsController } from './match-divisions.controller';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [MatchDivisionsController],
  providers: [MatchDivisionsService],
  exports: [MatchDivisionsService],
})
export class MatchDivisionsModule {}