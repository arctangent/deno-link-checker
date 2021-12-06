
// Link Checker

import { parse as parseCommandLineArguments } from "https://deno.land/std/flags/mod.ts";

import { Database } from './database.ts';
import { Parser } from './parser.ts';
import * as helpers from './helpers.ts';

/*
 Configuration
*/

// e.g. `deno run index.ts https://www.example.com /excluded /also/excluded` to use all default args
// or e.g. `deno run index.ts -m 1000 -r 250 -t 3600 https://www.example.com /excluded /also/excluded`

// Grab the command line params
const args = parseCommandLineArguments(
    Deno.args,
    {
        alias: {
            m: "MAX_REQUESTS",
            r: "REQUEST_INTERVAL",
            t: "TIME_TO_LIVE"
        }
    }
);

// Build our config object
const config = {
    DOMAIN: 'https://www.nhs.uk',   // Default to potentially be overwritten below
    EXCLUDES: ['/service-search'],  // Default to potentially be overwritten below
    MAX_REQUESTS: args.MAX_REQUESTS ?? 100,     // Set to zero to enforce no limit,
    REQUEST_INTERVAL: args.MAX_REQUESTS ?? 100, // How many ms to sleep between HTTP requests,
    TIME_TO_LIVE: args.TIME_TO_LIVE ?? 15*60,   // After how many seconds is data considered stale,
};

// Overwrite the default DOMAIN and EXCLUDES if supplied
if (args._) {
    if (args._.length > 0) config.DOMAIN = args._[0] as string;
    if (!config.DOMAIN.startsWith('https://')) config.DOMAIN = 'https://' + config.DOMAIN;
    if (args._.length > 1) config.EXCLUDES = args._.slice(1) as string[];
}

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