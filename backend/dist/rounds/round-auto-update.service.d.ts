import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
export declare class RoundAutoUpdateService {
    private db;
    private readonly logger;
    constructor(db: NodePgDatabase<typeof schema>);
    autoUpdateCurrentRounds(): Promise<void>;
    private shouldUpdateCurrentRound;
    private findNextAppropriateRound;
}
