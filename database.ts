
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

export async function dbAddUrl(url: string) {
    await database.insertOne({ url: url });
}

export async function dbUpdate(url: string, params: Omit<RequestResponse, 'url'>) {
    // NOTE: If url not found then no action taken
    await database.updateOne({ url: url }, params);
}