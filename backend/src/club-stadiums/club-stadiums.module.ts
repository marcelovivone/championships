import { Module } from '@nestjs/common';
import { ClubStadiumsService } from './club-stadiums.service';
import { ClubStadiumsController } from './club-stadiums.controller';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [ClubStadiumsController],
  providers: [ClubStadiumsService],
  exports: [ClubStadiumsService],
})
export class ClubStadiumsModule {}
