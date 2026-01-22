import { Module } from '@nestjs/common';
import { StadiumsService } from './stadiums.service';
import { StadiumsController } from './stadiums.controller';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [StadiumsController],
  providers: [StadiumsService],
  exports: [StadiumsService],
})
export class StadiumsModule {}