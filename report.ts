
// Usage: deno run --allow-all report.ts www.nhs.uk

import {parse} from "https://deno.land/std@0.135.0/flags/mod.ts";

import { Database } from './database.ts';

const project = parse(Deno.args)._[0];
if (!project) Deno.exit();

// Open DB and read data
const db = new Database(`./data/${project}/db.json`);
const data = db.db.documents;

// Generate the responses report
let redirects = "url,status,redirected,redirectsTo";
for (const item of data) {
    redirects += `\n${item.url},${item.status},${item.redirected},`;
    if (item.url != item.location) redirects += item.location;

}
Deno.writeTextFileSync(`./data/${project}/redirects.csv`, redirects);


// Generate the inbound links report
let inbounds = "url,status,inbounds";
const map = new Map<string, string[]>();
for (const item of data) {
    for (const hyperlink of item.hyperlinks) {
        const inbounds = map.get(hyperlink);
        if (!inbounds) {
            map.set(hyperlink, [item.location]);
        } else {
            inbounds.push(item.location);
            map.set(hyperlink, inbounds);
        }
    }
}
for (const item of data) {
    if (item.status == 200) continue    // These are uninteresting
    inbounds += `\n${item.location},${item.status},${map.get(item.location)?.join('|')}`;
}
Deno.writeTextFileSync(`./data/${project}/inbounds.csv`, inbounds);
