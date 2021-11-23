
// Link Checker

import { getCanonicalHrefs } from './parser.ts';
import { dbAddUrl, dbUpdateUrl, dbUnscannedUrls } from './database.ts';

// Spider the site and store responses

const domain = 'https://www.nhs.uk';
let max = 10;

await dbAddUrl(domain);



let batch: string[] = []

infiniteLoop:
while (true) {
    batch = await dbUnscannedUrls();
    if (batch.length == 0) break;

    for (const url of batch) {
        max--; if (max==0) break infiniteLoop;
        console.log(max + ' Scanning ' + url);

        const response = await fetch(url, { redirect: 'manual' });
        const html = await response.text();

        await dbUpdateUrl(url, { status: response.status })

        const hrefs = getCanonicalHrefs(domain, html);

        for (const href of hrefs) {
            await dbAddUrl(href);
        }
    }
}