
// Link Checker

import { getCanonicalHrefs } from './parser.ts';
import { dbAddUrlIfNotExists, dbUpdateUrlIfExists, dbGetUnscannedUrls } from './database.ts';

// TODO: These should be exposed as command line arguments

const domain = 'https://www.nhs.uk';
const maxDepth = 2;
const maxRequests = 10;

// Spider the site and store response data

await dbAddUrlIfNotExists(domain);

let batch: string[] = []
let currentDepth = 0;
let currentRequests = 0;

infiniteLoop:
while (true) {

    // Guard for maxDepth
    currentDepth++;
    if (currentDepth > maxDepth) break infiniteLoop;

    // Pull urls from the queue
    batch = await dbGetUnscannedUrls();

    // Guard for empty batch i.e. we're done
    if (batch.length == 0) break;

    for (const url of batch) {

        // Guard for maxRequests
        currentRequests++;
        if (currentRequests > maxRequests) break infiniteLoop;

        // Basic progress indicator
        console.log(currentRequests.toString().padStart(6, '0') + ': Scanning ' + url);

        // Fetch the url and store data
        const response = await fetch(url, { redirect: 'manual' });
        const html = await response.text();
        await dbUpdateUrlIfExists(url, { status: response.status })

        // Add all detected hrefs to the queue
        const hrefs = getCanonicalHrefs(domain, html);
        for (const href of hrefs) {
            await dbAddUrlIfNotExists(href);
            // TODO: Update each URL with a "last seen" timestap
            // to help identify pages which have been deleted?
        }
    }
}