
import { Database } from 'https://deno.land/x/aloedb@0.9.0/mod.ts';

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

const database = new Database<RequestResponse>('./database.json');

export async function flush() {
    await database.drop();
}

export async function count(params: Partial<RequestResponse>) {
    return await database.count(params);
}

export async function addUrlIfNotExists(url: string, params?: Omit<RequestResponse, 'url'>) {
    const exists = await database.count({ url: url });
    if (exists != 0) return;
    await database.insertOne({ url: url, status: 0 });
    if (params) {
        await database.updateOne({ url: url }, params);
    }
}

export async function updateUrlIfExists(url: string, params: Omit<RequestResponse, 'url'>) {
    // NOTE: If url not found then no action taken
    await database.updateOne({ url: url }, params);
}

export async function getUnscannedUrls() {
    const objs = await database.findMany({ status: 0 });
    const urls = [];
    for (const obj of objs) {
        urls.push(obj.url);
    }
    return urls;
}