import { Module } from '@nestjs/common';
import { SportsService } from './sports.service';
import { SportsController } from './sports.controller';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [SportsController],
  providers: [SportsService],
})
export class SportsModule {}