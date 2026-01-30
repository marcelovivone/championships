import { Module } from '@nestjs/common';
import { SportClubsController } from './sport-clubs.controller';
import { SportClubsService } from './sport-clubs.service';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [SportClubsController],
  providers: [SportClubsService],
  exports: [SportClubsService],
})
export class SportClubsModule {}
