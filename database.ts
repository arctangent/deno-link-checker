
import { Database as AloeDB, lessThan } from 'https://deno.land/x/aloedb@0.9.0/mod.ts';

interface RequestResponse {
    url: string;
    status: number; // HTTP Status Code on last scan
    type: string;  // HTTP ContentType on last scan
    // Timestamping
    timestamp: number;  // Unix epoch
    // Track hrefs in page content
    outboundHyperlinks: string[];  // Where does this page link to
    inboundHyperlinks: string[];   // Which pages link here
    // Track redirects
    outboundRedirect: string;  // Where does this URL redirect to
    inboundRedirects: string[] // Which URLs redirect to here
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
        // Construct an empty record
        await this.db.insertOne({
            url: url,
            status: 0,
            type: '',
            timestamp: 0,
            outboundHyperlinks: [],
            inboundHyperlinks: [],
            outboundRedirect: '',
            inboundRedirects: []
        });
    }

    async update(url: string, params: Partial<RequestResponse>) {
        // NOTE: If url not found then no action taken
        await this.db.updateOne({ url: url }, params);
        await this.db.updateOne({ url: url }, { timestamp: Date.now() });
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
        const objs = await this.db.findMany({ timestamp: lessThan(threshold) });
        return Array.from(objs, obj => obj.url);
    }

    async addInboundHyperlink(target: string, origin: string) {
        await this.db.updateOne({ url: target }, (record: RequestResponse) => {
            let newList = [origin]
            newList.push(...record.inboundHyperlinks);
            newList = [...new Set(newList)].sort();
            record.inboundHyperlinks = newList;
            return record;
        });
    }

    async addInboundRedirect(target: string, origin: string) {
        await this.db.updateOne({ url: target }, (record: RequestResponse) => {
            let newList = [origin]
            newList.push(...record.inboundRedirects);
            newList = [...new Set(newList)].sort();
            record.inboundRedirects = newList;
            return record;
        });
    }
}
