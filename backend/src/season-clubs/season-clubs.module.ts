import { Module } from '@nestjs/common';
import { SeasonClubsService } from './season-clubs.service';
import { SeasonClubsController } from './season-clubs.controller';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [SeasonClubsController],
  providers: [SeasonClubsService],
  exports: [SeasonClubsService],
})
export class SeasonClubsModule {}