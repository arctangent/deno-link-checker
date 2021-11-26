
// Link Checker

import * as parser from './parser.ts';
import * as helpers from './helpers.ts';
import * as db from './database.ts';

// TODO: These should be exposed as command line arguments

const DOMAIN = 'https://www.nhs.uk';
const MAX_REQUESTS = 0;  // Set to zero to enforce no limit
const REQUEST_INTERVAL = 500;    // How many ms to sleep inbetween HTTP requests

// Spider the site and store response data

await db.addUrlIfNotExists(DOMAIN);

let batch: string[] = []  
let requestCount = 0;

infiniteLoop:
while (true) {

    // Pull urls from the queue
    // TODO: We will want to re-scan URLs after
    // some period of time has elapsed
    batch = await db.getUnscannedUrls();

    // Guard for empty batch i.e. we're done
    if (batch.length == 0) break;

    for (const url of batch) {

        // Guard for maxRequests
        requestCount++;
        if (MAX_REQUESTS && (requestCount > MAX_REQUESTS)) break infiniteLoop;     

        // Fetch the url and store data
        const response = await fetch(url, { redirect: 'manual' });
        const html = await response.text();

        // Build progress info string for later display to user
        let info = helpers.paddedRequestCount(requestCount) + ': ' + response.status + ' ' + url;
    
        // Process the response
        if (response.status.toString().startsWith('3')) {
            // Process a redirect
            let redirectsTo = response.headers.get('location') ?? '';
            // FIXME: Sanitising will blank out redirects to external sites
            //        This may not be what we want to
            redirectsTo = parser.sanitise(DOMAIN, redirectsTo);
            await db.updateUrlIfExists(url, {
                status: response.status,
                type: response.headers.get('content-type') ?? '',
                timestamp: Date.now(),
                redirectsTo: redirectsTo
            })
            // Queue the next hop in the redirect chain
            await db.addUrlIfNotExists(redirectsTo);
            info += ' --> ' + redirectsTo;
        } else {
            // Process any response except a redirect
            // Add all detected hrefs to the queue
            const hrefs = parser.getCanonicalHrefs(DOMAIN, html);
            for (const href of hrefs) {
                await db.addUrlIfNotExists(href);
            }
            // Update this url
            await db.updateUrlIfExists(url, {
                status: response.status,
                type: response.headers.get('content-type') ?? '',
                timestamp: Date.now(),
                linksTo: hrefs,
            })
        }
        // Display progress to user
        console.log(info);

        // Play nice with the server
        await helpers.sleep(REQUEST_INTERVAL);

    }

}