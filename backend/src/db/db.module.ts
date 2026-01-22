import { Module, Global } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as schema from './schema';

// Load environment variables from .env file
dotenv.config();

@Global()
@Module({
  providers: [
    {
      provide: 'DRIZZLE',
      useFactory: () => {
        // Create a new PostgreSQL connection pool using the DATABASE_URL from .env
        // This ensures the application uses the correct port (5433) and credentials
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
        });

        // Initialize Drizzle ORM with the connection pool and the database schema
        // The schema argument is required for relational queries to work correctly
        return drizzle(pool, { schema });
      },
    },
  ],
  // Export the DRIZZLE provider so it can be injected into other modules
  exports: ['DRIZZLE'],
})
export class DbModule {}