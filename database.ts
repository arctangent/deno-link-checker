
import { Database as AloeDB, lessThan } from 'https://deno.land/x/aloedb@0.9.0/mod.ts';

interface RequestResponse {
    url: string;
    // HTTP Status Code on last scan
    // If we were redirected then this is
    // the status code of the eventual location
    status: number;
    // Timestamping info to help detect stale data
    lastUpdated: number;    // When did we last scan this URL
    lastDetected: number;   // When was this URL last found in a page
    // HREFs found in page content
    hyperlinks: string[];
    // Where we redirected when requesting this URL?
    redirected: boolean;
    // Where does this URL eventually resolve to?
    // This will be the same as URL if not redirected,
    // otherwise it will be the last hop in any redirect chain
    location: string;       
}

export class Database {

    db: AloeDB<RequestResponse>;

    constructor(path?: string) {
        if (path) {
            this.db = new AloeDB<RequestResponse>(path);
        } else {
            // In-memory DB used for testing
            this.db = new AloeDB<RequestResponse>();
        }
    }

    async flush() {
        await this.db.drop();
    }

    async count(params: Partial<RequestResponse>) {
        return await this.db.count(params);
    }

    async enqueue(url: string) {
        const exists = await this.db.count({ url: url });
        // If URL has previously been detected then
        // record the new detection and exit
        if (exists != 0) {
            await this.db.updateOne({ url: url }, { lastDetected: Date.now() })
            return;
        }
        // Construct an empty record
        await this.db.insertOne({
            url: url,
            status: 0,
            lastUpdated: 0,
            lastDetected: Date.now(),
            hyperlinks: [],
            redirected: false,
            location: '',
        });
    }

    async update(url: string, params: Partial<RequestResponse>) {
        // NOTE: If url not found then no action taken
        await this.db.updateOne({ url: url }, params);
        await this.db.updateOne({ url: url }, { lastUpdated: Date.now() });
    }

    async get(url: string) {
        return await this.db.findOne({ url: url });
    }

    async getQueued() {
        const objs = await this.db.findMany({ status: 0 });
        return Array.from(objs, obj => obj.url);
    }

    async getStale(timeToLive: number) {
        const threshold = Date.now() - (timeToLive * 1000);
        const objs = await this.db.findMany({ lastUpdated: lessThan(threshold) });
        return Array.from(objs, obj => obj.url);
    }

}
