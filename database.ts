
import { Database } from 'https://deno.land/x/aloedb@0.9.0/mod.ts';

interface RequestResponse {
    url: string;
    status: number; // HTTP Status Code on last scan
    type?: string;   // HTTP ContentType on last scan
    metaLastScanned?: number;    // Unix epoch
    metaLastScraped?: number;    // Unix epoch
    inboundUrls?: string[];
    outboundUrls?: string[];
}

const database = new Database<RequestResponse>('./database.json');

export async function dbAddUrl(url: string) {
    // We use status==0 to indicate an unscanned Url
    await database.insertOne({ url: url, status: 0 });
}

export async function dbUpdateUrl(url: string, params: Omit<RequestResponse, 'url'>) {
    // NOTE: If url not found then no action taken
    await database.updateOne({ url: url }, params);
}

export async function dbUnscannedUrls() {
    const objs = await database.findMany({ status: 0 });
    const urls = [];
    for (const obj of objs) {
        urls.push(obj.url);
    }
    return urls;
}