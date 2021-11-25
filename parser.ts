
const hrefRegex = /href\s*=\s*(?:[\'\"]*)([^\s\>\'\"\#\?]*)(?:[\'\"\s]*)/g;

export function getCanonicalHrefs(root: string, text: string) {
    const matches = text.matchAll(hrefRegex);
    let output: string[] = [];
    for (const match of matches) {
        const href = sanitise(root, match[1]);
        if (href) output.push(href);
    }

    // Make unique and sort alphabetically
    output = [...new Set(output)].sort();

    return output;
}

export function sanitise(root: string, url: string) {
    // Sanitise
    if (url == '') return '';
    if (url == '/') return '';
    url = url.startsWith('/') ? root + url : url;
    if (url == root) return '';
    if (url == root + '/') return '';
    if (url.startsWith('tel:')) return '';
    if (url.startsWith('email:')) return '';
    if (!url.startsWith(root)) return '';
    return url;
}