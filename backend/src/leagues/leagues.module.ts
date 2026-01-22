import { Module } from '@nestjs/common';
import { LeaguesService } from './leagues.service';
import { LeaguesController } from './leagues.controller';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [LeaguesController],
  providers: [LeaguesService],
})
export class LeaguesModule {} // Certifique-se de que o 'export' está aqui!