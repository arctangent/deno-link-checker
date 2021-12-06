
import { parse } from "https://deno.land/std/flags/mod.ts";

// Usage
// e.g. `deno run index.ts https://www.example.com /excluded /also/excluded` to use all default args
// or e.g. `deno run index.ts -m 1000 -r 250 -t 3600 https://www.example.com /excluded /also/excluded`

// Grab the command line params
const args = parse(
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
export const config = {
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
