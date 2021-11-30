
// Link Checker

import { Database } from './database.ts';
import { Parser } from './parser.ts';
import * as helpers from './helpers.ts';


// TODO: These should be exposed as command line arguments

const DOMAIN = 'https://www.nhs.uk';
const EXCLUDES = ['/service-search'];   // These URLs will be completely ignored
const MAX_REQUESTS = 100;       // Set to zero to enforce no limit
const REQUEST_INTERVAL = 100;   // How many ms to sleep inbetween HTTP requests
const TIME_TO_LIVE = 15*60;     // After how many seconds is data considered stale

// Initialisation

const parser = new Parser(DOMAIN, EXCLUDES);
const db = new Database('./data/db.live.json');

// Spider the site and store response data

await db.enqueue(DOMAIN);

let batch = [DOMAIN]; 
let requestCount = 0;

infiniteLoop:
while (true) {

    // Guard for empty batch i.e. we're done
    if (batch.length == 0) break;

    for (const url of batch) {

        // Guard for maxRequests
        requestCount++;
        if (MAX_REQUESTS && (requestCount > MAX_REQUESTS)) break infiniteLoop;     

        // Scrub old data
        await db.update(url, {
            status: 0,
            type: '',
            outboundHyperlinks: [],
            outboundRedirect: '',
        })

        // Fetch the url and store data
        const response = await fetch(url, { redirect: 'manual' });
        const html = await response.text();

        // Build progress info string for later display to user
        let info = helpers.paddedRequestCount(requestCount) + ': ' + response.status + ' ' + url;
    
        // Process the response
        if (response.status.toString().startsWith('3')) {
            // Process a redirect
            const redirect = response.headers.get('location') ?? '';
            await db.update(url, {
                status: response.status,
                // We store this without cleaning because we
                // want to know the real value of the redirect
                outboundRedirect: redirect
            })
            // Clean the redirect and queue the next hop in the redirect chain
            const newURL = parser.cleanURL(redirect);
            if (newURL) {
                await db.enqueue(newURL);
                await db.addInboundRedirect(newURL, url);
            }
            info += ' --> ' + newURL;
        } else {
            // Process any response except a redirect
            // Add all detected hrefs to the queue
            const hrefs = parser.getURLs(html);
            for (const href of hrefs) {
                // FIXME: This is not a very efficient way to do things
                await db.enqueue(href);
                await db.addInboundHyperlink(href, url);
            }
            // Update this url
            await db.update(url, {
                status: response.status,
                type: response.headers.get('content-type') ?? '',
                outboundHyperlinks: hrefs,
            })
        }
        // Display progress to user
        console.log(info);

        // Play nice with the server
        await helpers.sleep(REQUEST_INTERVAL);

        // Create a new batch of URLs to process
        batch = [
            ...await db.getStale(TIME_TO_LIVE),
            ...await db.getQueued(),
        ];
    }

}