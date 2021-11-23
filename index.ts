
// Link Checker

import { getCanonicalHrefs } from './parser.ts';

// Set up database

import { Database } from 'https://deno.land/x/aloedb@0.9.0/mod.ts';

interface RequestResponse {
    url: string;
    status: number;
}

const db = new Database<RequestResponse>('./database.json');

// Spider the site and store responses

const targetDomain = 'https://www.nhs.uk';

await db.insertOne({ url: targetDomain, status: 0});

// Start a loop here

const url = targetDomain;

// Can also do `fetch(targetDomain, { redirect: 'manual' })`
// in order to disable automatic following of redirects
const response = await fetch(targetDomain, { redirect: 'manual' });
const html = await response.text();

await db.updateOne({ url: url }, { status: response.status });

const hrefs = getCanonicalHrefs(targetDomain, html);

for (const href of hrefs) {
    console.log(href);
    await db.insertOne({ url: href, status: 0});
}





