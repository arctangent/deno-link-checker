
// Link Checker

import { getCanonicalHrefs } from './parser.ts';
import { fullyQualify, sleep } from './helpers.ts';
import { dbAddUrlIfNotExists, dbUpdateUrlIfExists, dbGetUnscannedUrls } from './database.ts';

// TODO: These should be exposed as command line arguments

const domain = 'https://www.nhs.uk';
const maxRequests = 0;  // Set to zero to enforce no limit
const timeout = 500;    // How many ms to sleep inbetween HTTP requests

// Spider the site and store response data

await dbAddUrlIfNotExists(domain);

let batch: string[] = []  
let requestCount = 0;

infiniteLoop:
while (true) {

    // Pull urls from the queue
    // TODO: We will want to re-scan URLs after
    // some period of time has elapsed
    batch = await dbGetUnscannedUrls();

    // Guard for empty batch i.e. we're done
    if (batch.length == 0) break;

    for (const url of batch) {

        // Guard for maxRequests
        requestCount++;
        if (maxRequests && (requestCount > maxRequests)) break infiniteLoop;     

        // Fetch the url and store data
        const response = await fetch(url, { redirect: 'manual' });
        const html = await response.text();

        // Build progress info string for later display to user
        let info = requestCount.toString().padStart(6, '0') + ': ' + response.status + ' ' + url;
    
        // Process the response
        if (response.status.toString().startsWith('3')) {
            // Process a redirect
            let redirectsTo = response.headers.get('location') ?? '';
            redirectsTo = fullyQualify(domain, redirectsTo);
            await dbUpdateUrlIfExists(url, {
                status: response.status,
                type: response.headers.get('content-type') ?? '',
                timestamp: Date.now(),
                redirectsTo: redirectsTo
            })
            // Queue the next hop in the redirect chain
            await dbAddUrlIfNotExists(redirectsTo);
            info += ' --> ' + redirectsTo;
        } else {
            // Process any response except a redirect
            // Add all detected hrefs to the queue
            const hrefs = getCanonicalHrefs(domain, html);
            for (const href of hrefs) {
                await dbAddUrlIfNotExists(href);
            }
            // Update this url
            await dbUpdateUrlIfExists(url, {
                status: response.status,
                type: response.headers.get('content-type') ?? '',
                timestamp: Date.now(),
                linksTo: hrefs,
            })
        }
        // Display progress to user
        console.log(info);

        // Play nice with the server
        await sleep(timeout);

    }

}