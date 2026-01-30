import { Module } from '@nestjs/common';
import { ClubsService } from './clubs.service';
import { ClubsController } from './clubs.controller';
import { ClubsImagesController } from './clubs-images.controller';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [ClubsController, ClubsImagesController],
  providers: [ClubsService],
})
export class ClubsModule {}