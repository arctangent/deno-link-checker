
import { Database as AloeDB, lessThan } from 'https://deno.land/x/aloedb@0.9.0/mod.ts';

interface RequestResponse {
    url: string;
    status: number; // HTTP Status Code on last scan
    type?: string;   // HTTP ContentType on last scan
    // Timestamping
    timestamp: number;    // Unix epoch
    // Track hrefs in page content
    linksTo?: string[];         // Where does this page link to
    // Track redirects
    redirectsTo?: string;       // Where does this URL redirect to
}

export class Database {

    db: AloeDB<RequestResponse>;

    constructor(path: string) {
        this.db = new AloeDB<RequestResponse>(path);
    }

    async flush() {
        await this.db.drop();
    }

    async count(params: Partial<RequestResponse>) {
        return await this.db.count(params);
    }

    async enqueue(url: string) {
        const exists = await this.db.count({ url: url });
        if (exists != 0) return;
        // We set status and timestamp to zero because the URL has not yet been scanned
        await this.db.insertOne({ url: url, status: 0, timestamp: 0 });
    }

    async update(url: string, params: Omit<RequestResponse, 'url' | 'timestamp'>) {
        // NOTE: If url not found then no action taken
        await this.db.updateOne({ url: url }, params);
        await this.db.updateOne({ url: url }, { timestamp: Date.now() });
    }

    async getQueued() {
        const objs = await this.db.findMany({ status: 0 });
        return Array.from(objs, obj => obj.url);
    }

    async getStale(timeToLive: number) {
        const threshold = Date.now() - (timeToLive * 1000);
        const objs = await this.db.findMany({ timestamp: lessThan(threshold) });
        return Array.from(objs, obj => obj.url);
    }

}
