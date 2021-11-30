
import { assertEquals } from "https://deno.land/std@0.115.1/testing/asserts.ts";

import { Database } from '../database.ts';

const db = new Database('./data/db.test.json')

Deno.test({
    name: 'database count does sums correctly',
    fn: async () => {
        await db.flush();
        await db.enqueue('https://www.example.com/1');
        await db.enqueue('https://www.example.com/2');
        assertEquals(2, await db.count({}));
        await db.enqueue('https://www.example.com/3');
        assertEquals(3, await db.count({}));
    }
});

Deno.test({
    name: 'database ignores duplicate hrefs',
    fn: async () => {
        await db.flush();
        const href = 'https://www.example.com';
        await db.enqueue(href);
        await db.enqueue(href);
        assertEquals(1, await db.count({}));
    }
});

Deno.test({
    name: 'database getQueued works correctly',
    fn: async () => {
        await db.flush();
        await db.enqueue('url1');
        await db.enqueue('url2');
        await db.update('url2', { status: 200 })
        assertEquals(['url1'], await db.getQueued());
    }
});

Deno.test({
    name: 'database addInboundHyperlink ignores duplicates',
    fn: async () => {
        await db.flush();
        await db.enqueue('url1');
        await db.addInboundHyperlink('url1', 'url2');
        await db.addInboundHyperlink('url1', 'url2');
        const record = await db.get('url1');
        assertEquals(1, record?.inboundHyperlinks.length);
    }
});

Deno.test({
    name: 'database addInboundRedirects ignores duplicates',
    fn: async () => {
        await db.flush();
        await db.enqueue('url1');
        await db.addInboundRedirect('url1', 'url2');
        await db.addInboundRedirect('url1', 'url2');
        const record = await db.get('url1');
        assertEquals(1, record?.inboundRedirects.length);
    }
});
