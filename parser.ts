
export class Parser {

    domain: string;
    readonly hrefRegex = /href\s*=\s*(?:[\'\"]*)([^\s\>\'\"\#\?]*)(?:[\'\"\s]*)/g;

    constructor(domain: string) {
        this.domain = domain;
    }

    getURLs(input: string): string[] {
        const matches = input.matchAll(this.hrefRegex);
        let output: string[] = [];
        for (const match of matches) {
            const href = this.cleanURL(match[1]);
            if (href) output.push(href);
        }
        // Make unique and sort alphabetically
        output = [...new Set(output)].sort();

        return output;
    }

    cleanURL(url: string): string | null {
        // Reject empty URLs
        if (url == '') return null;
        if (url == '/') return null;
        // Fix naked URLs
        url = url.startsWith('/') ? this.domain + url : url;
        // Reject URLs same as domain
        if (url == this.domain) return null;
        if (url == this.domain + '/') return null;
        // Reject non-HTTP schemas
        if (url.startsWith('tel:')) return null;
        if (url.startsWith('email:')) return null;
        // Reject external URLs
        if (!url.startsWith(this.domain)) return null;
        // URL is clean
        return url;
    }

}