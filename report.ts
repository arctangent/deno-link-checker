
// Usage: deno run --allow-all report.ts www.nhs.uk

import {parse} from "https://deno.land/std@0.135.0/flags/mod.ts";

import { Database } from './database.ts';

const project = parse(Deno.args)._[0];
if (!project) Deno.exit();

// Open DB and read data
const db = new Database(`./data/${project}/db.json`);
const data = db.db.documents;

// Generate the responses report
let redirects = "url,status,redirected,location";
for (const item of data) {
    redirects += `\n${item.url},${item.status},${item.redirected},`;
    if (item.url != item.location) redirects += item.location;

}
Deno.writeTextFileSync(`./data/${project}/redirects.csv`, redirects);


// Build map of inbound links

const map = new Map<string, string[]>();
for (const item of data) {
    for (const hyperlink of item.hyperlinks) {
        const inbounds = map.get(hyperlink);
        if (!inbounds) {
            map.set(hyperlink, [item.url]);
        } else {
            inbounds.push(item.url);
            map.set(hyperlink, inbounds);
        }
    }
}

// Generate the inbound links report

let inbounds = "url,status,redirected,location,inbounds";
for (const item of data) {
    // We are not interested in URLs
    // that point to the right place
    if (!item.redirected && item.status == 200) continue
    // There could be lots of inbound links, so we output them line by line
    for (const inbound of map.get(item.url)||[]) {
        inbounds += `\n${item.url},${item.status},${item.redirected},${item.location},${inbound}`;
    }
}
Deno.writeTextFileSync(`./data/${project}/inbounds.csv`, inbounds);
