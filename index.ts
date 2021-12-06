
// Link Checker

import { config } from './configurator.ts';
import { Database } from './database.ts';
import { Parser } from './parser.ts';
import * as helpers from './helpers.ts';

/*
 Initialisation
*/

const parser = new Parser(config.DOMAIN, config.EXCLUDES);
const db = new Database(`./data/${config.DOMAIN.split('//')[1]}/db.json`);

/*
 Spider the site and store response data
*/

await db.enqueue(config.DOMAIN);

let batch = [config.DOMAIN]; 
let requestCount = 0;

infiniteLoop:
while (true) {

    // Guard for empty batch i.e. we're done
    if (batch.length == 0) break;

    for (const url of batch) {

        // Guard for maxRequests
        requestCount++;
        if (config.MAX_REQUESTS && (requestCount > config.MAX_REQUESTS)) break infiniteLoop;     

        // Scrub old data
        await db.update(url, {
            status: 0,
            hyperlinks: [],
            location: '',
        })

        // Fetch the url and store data
        const response = await fetch(url);
        const html = await response.text();

        // Build progress info string for later display to user
        // FIXME: This is ugly
        let info = helpers.paddedRequestCount(requestCount) + ': ' + response.status + ' ';
        if (response.redirected) info += 'R ';
        info += url;
    
        // Process the response

        const hrefs = parser.getURLs(html);
        for (const href of hrefs) {
            await db.enqueue(href);
        }

        await db.update(url, {
            status: response.status,
            hyperlinks: hrefs,
            redirected: response.redirected,
            location: response.url,
        });

        // Display progress to user
        console.log(info);

        // Create a new batch of URLs to process
        batch = [
            ...await db.getStale(config.TIME_TO_LIVE),
            ...await db.getQueued(),
        ];

        // Introduce a deliberate delay between requests
        await helpers.sleep(config.REQUEST_INTERVAL);

    }

}