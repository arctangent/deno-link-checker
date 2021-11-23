
// Link Checker

import { getCanonicalHrefs } from './parser.ts';
import { dbAddUrl, dbUpdate } from './database.ts';

// Spider the site and store responses

const domain = 'https://www.nhs.uk';

await dbAddUrl(domain);

// TODO: Start a loop here

const url = domain;

// Can also do `fetch(domain, { redirect: 'manual' })`
// in order to disable automatic following of redirects
const response = await fetch(domain, { redirect: 'manual' });
const html = await response.text();

await dbUpdate(url, { status: response.status })

const hrefs = getCanonicalHrefs(domain, html);

for (const href of hrefs) {
    console.log(href);
    await dbAddUrl(href);
}
