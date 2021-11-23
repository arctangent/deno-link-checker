
import { assertEquals } from "https://deno.land/std@0.115.1/testing/asserts.ts";

import { dbFlush, dbCount, dbAddUrl } from '../database.ts';

Deno.test({
    name: 'database dbCount does sums correctly',
    fn: async () => {
        await dbFlush();
        await dbAddUrl('https://www.example.com/1');
        await dbAddUrl('https://www.example.com/2');
        assertEquals(2, await dbCount({}));
        await dbAddUrl('https://www.example.com/3');
        assertEquals(3, await dbCount({}));
    }

});

Deno.test({
    name: 'database ignores duplicate hrefs',
    fn: async () => {
        await dbFlush();
        const href = 'https://www.example.com';
        await dbAddUrl(href);
        await dbAddUrl(href);
        assertEquals(1, await dbCount({}));
    }
});
