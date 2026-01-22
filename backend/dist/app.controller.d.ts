import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './db/schema';
export declare class AppController {
    private db;
    constructor(db: NodePgDatabase<typeof schema>);
    health(): Promise<{
        status: string;
        message: string;
    }>;
}
