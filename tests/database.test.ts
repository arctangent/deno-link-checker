
import { assertEquals } from "https://deno.land/std@0.115.1/testing/asserts.ts";

import { Database } from '../database.ts';

const db = new Database('./data/db.test.json')

Deno.test({
    name: 'database dbCount does sums correctly',
    fn: async () => {
        await db.flush();
        await db.addUrlIfNotExists('https://www.example.com/1');
        await db.addUrlIfNotExists('https://www.example.com/2');
        assertEquals(2, await db.count({}));
        await db.addUrlIfNotExists('https://www.example.com/3');
        assertEquals(3, await db.count({}));
    }

});

Deno.test({
    name: 'database ignores duplicate hrefs',
    fn: async () => {
        await db.flush();
        const href = 'https://www.example.com';
        await db.addUrlIfNotExists(href);
        await db.addUrlIfNotExists(href);
        assertEquals(1, await db.count({}));
    }
});
