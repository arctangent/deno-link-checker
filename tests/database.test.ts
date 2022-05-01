
import { assertEquals } from "https://deno.land/std@0.136.0/testing/asserts.ts";
import {describe, it} from "https://deno.land/std@0.136.0/testing/bdd.ts";

import { Database } from '../database.ts';

describe('Database', () => {

    const db = new Database();

    it('count() does sums correctly', async () => {
        await db.flush();
        await db.enqueue('https://www.example.com/1');
        await db.enqueue('https://www.example.com/2');
        assertEquals(2, await db.count({}));
        await db.enqueue('https://www.example.com/3');
        assertEquals(3, await db.count({}));
    });

    it('enqueue() ignores duplicate hrefs', async () => {
        await db.flush();
        const href = 'https://www.example.com';
        await db.enqueue(href);
        await db.enqueue(href);
        assertEquals(1, await db.count({}));
    });

    it('getQueued() works correctly', async () => {
        await db.flush();
        await db.enqueue('url1');
        await db.enqueue('url2');
        await db.update('url2', { status: 200 })
        assertEquals(['url1'], await db.getQueued());
    });

});
