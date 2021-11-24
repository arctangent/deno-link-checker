
import { Database } from 'https://deno.land/x/aloedb@0.9.0/mod.ts';

interface RequestResponse {
    url: string;
    status?: number; // HTTP Status Code on last scan
    type?: string;   // HTTP ContentType on last scan
    metaLastScanned?: number;    // Unix epoch
    metaLastScraped?: number;    // Unix epoch
    inboundUrls?: string[];
    outboundUrls?: string[];
}

const database = new Database<RequestResponse>('./database.json');

export async function dbFlush() {
    await database.drop();
}

export async function dbCount(params: Partial<RequestResponse>) {
    return await database.count(params);
}

export async function dbAddUrlIfNotExists(url: string) {
    const exists = await database.count({ url: url });
    if (exists != 0) return;
    await database.insertOne({ url: url, status: 0 });
}

export async function dbUpdateUrlIfExists(url: string, params: Omit<RequestResponse, 'url'>) {
    // NOTE: If url not found then no action taken
    await database.updateOne({ url: url }, params);
}

export async function dbGetUnscannedUrls() {
    const objs = await database.findMany({ status: 0 });
    const urls = [];
    for (const obj of objs) {
        urls.push(obj.url);
    }
    return urls;
}