import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle ORM configuration file.
 * This file defines the schema location, output directory for migrations,
 * and database connection credentials.
 */
export default defineConfig({
  // Path to the schema definitions
  schema: './src/db/schema.ts',
  
  // Folder where migration SQL files will be generated
  out: './drizzle',
  
  // Database dialect
  dialect: 'postgresql',
  
  // Database connection credentials based on docker-compose.yml
  dbCredentials: {
    // Format: postgresql://[user]:[password]@[host]:[port]/[database]
    // User: admin, Password: knpt041121, Port: 5433, DB: championships_db
    url: 'postgresql://admin:knpt041121@localhost:5433/championships_db',
  },
});