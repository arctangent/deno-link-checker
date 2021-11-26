
import { Database as AloeDB } from 'https://deno.land/x/aloedb@0.9.0/mod.ts';

interface RequestResponse {
    url: string;
    status?: number; // HTTP Status Code on last scan
    type?: string;   // HTTP ContentType on last scan
    // Timestamping
    timestamp?: number;    // Unix epoch
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

    async addUrlIfNotExists(url: string, params?: Omit<RequestResponse, 'url'>) {
        const exists = await this.db.count({ url: url });
        if (exists != 0) return;
        await this.db.insertOne({ url: url, status: 0 });
        if (params) {
            await this.db.updateOne({ url: url }, params);
        }
    }

    async updateUrlIfExists(url: string, params: Omit<RequestResponse, 'url'>) {
        // NOTE: If url not found then no action taken
        await this.db.updateOne({ url: url }, params);
    }

    async getUnscannedUrls() {
        const objs = await this.db.findMany({ status: 0 });
        const urls = [];
        for (const obj of objs) {
            urls.push(obj.url);
        }
        return urls;
    }

}
