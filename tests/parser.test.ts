
import {
    assertEquals
} from "https://deno.land/std@0.136.0/testing/asserts.ts";
import {
    describe,
    it,
} from "https://deno.land/std@0.136.0/testing/bdd.ts";

import { Parser } from '../parser.ts';

const excludes = ['/ignore'];
const parser = new Parser('https://example.com', excludes);

describe('getURLs', () => {

    it('handles quoted and unquoted hrefs', () => {
        const input = `
            <a href='https://example.com/1'>1</a>
            <a href="https://example.com/2">2</a>
            <a href=https://example.com/3>3</a>
        `;
        const expected: string[] = [
            'https://example.com/1',
            'https://example.com/2',
            'https://example.com/3'
        ]
        assertEquals(expected, parser.getURLs(input));
    });

    it('ignores self links', () => {
        const input = `
            <a href=https://example.com>naked</a>
            <a href=https://example.com/>trailing slash</a>
        `;
        const expected: string[] = [];
        assertEquals(expected, parser.getURLs(input));
    });

    it('ignores zero length hrefs', ()=> {
        const input = `
            <a href=>zero</a>
        `;
        const expected: string[] = [];
        assertEquals(expected, parser.getURLs(input));
    });

    it('ignores anchor links',() => {
        const input = `
            <a href=#foo>naked anchor</a>
            <a href=https://example.com#foo>qualified anchor</a>
            <a href=https://example.com/deep/link#foo>deep qualified anchor</a>
        `;
        const expected: string[] = ['https://example.com/deep/link'];
        assertEquals(expected, parser.getURLs(input));
    });

    it('ignores querystring',() => {
        const input = `
            <a href=?foo>naked querystring</a>
            <a href=https://example.com?foo>qualified querystring</a>
            <a href=https://example.com/deep/link?foo>deep querystring</a>
        `;
        const expected: string[] = ['https://example.com/deep/link'];
        assertEquals(expected, parser.getURLs(input));
    });

    it('ignores non-https schemes',() => {
        const input = `
            <a href=tel:08005551234>phone</a>
            <a href=email:person@example.com>email</a>
        `;
        const expected: string[] = [];
        assertEquals(expected, parser.getURLs(input));
    });

    it('ignores external links',() => {
        const input = `
            <a href=https://not-example.com>external site</a>
        `;
        const expected: string[] = [];
        assertEquals(expected, parser.getURLs(input));
    });

    it('ignores href trailing space',() => {
        const input = `
            <a href=https://example.com/foo attr=value>complicated anchor tag</a>
        `;
        const expected: string[] = ['https://example.com/foo'];
        assertEquals(expected, parser.getURLs(input));
    });

    it('ignores excluded URLs',()=>{
        const input = `
            <a href=https://example.com/foo>included</a>
            <a href=https://example.com/ignore>excluded</a>
            <a href=https://example.com/IGNORE/ME>also excluded</a>
            <a href=https://example.com/ignore/me/too>also excluded</a>
        `;
        const expected: string[] = ['https://example.com/foo'];
        assertEquals(expected, parser.getURLs(input));
    });

});
