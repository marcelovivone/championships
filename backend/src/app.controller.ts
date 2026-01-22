import { Controller, Get, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './db/schema';

@Controller()
export class AppController {
  constructor(@Inject('DRIZZLE') private db: NodePgDatabase<typeof schema>) {}

  @Get('health')
  async health() {
    return { status: 'healthy', message: 'API is running' };
  }
}