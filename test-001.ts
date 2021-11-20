
// Link Checker


// Set up database

import { Database } from 'https://deno.land/x/aloedb@0.9.0/mod.ts';

interface RequestResponse {
    url: string;
    status: number;
}

const db = new Database<RequestResponse>('./database.json');






// We could stick a ? or # in this to terminate
// when a querystring or page anchor is detected
const hrefRegex = /href\s*=\s*(?:[\'\"]*)([^\s\>\'\"]*)(?:[\'\"\s]*)/g;

const targetDomain = 'https://www.nhs.uk';

await db.insertOne({ url: targetDomain, status: 0});

// Start a loop here

const url = targetDomain;


// Can also do `fetch(targetDomain, { redirect: 'manual' })`
// in order to disable automatic following of redirects
const response = await fetch(targetDomain, { redirect: 'manual' });
const html = await response.text();


await db.updateOne({ url: url }, { status: response.status });

const matches = html.matchAll(hrefRegex);

for (const match of matches) {
    await db.insertOne({ url: match[1], status: 0});
}





