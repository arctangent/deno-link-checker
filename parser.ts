
const hrefRegex = /href\s*=\s*(?:[\'\"]*)([^\s\>\'\"\#\?]*)(?:[\'\"\s]*)/g;

export function getCanonicalHrefs(root: string, text: string) {
    const matches = text.matchAll(hrefRegex);
    let output: string[] = [];
    for (const match of matches) {
        let href = match[1];
        if (href == '') continue;
        if (href == '/') continue;
        href = href.startsWith('/') ? root + href : href;
        if (href == root) continue;
        if (href == root + '/') continue;
        if (href.startsWith('tel:')) continue;
        if (href.startsWith('email:')) continue;
        if (!href.startsWith(root)) continue;
        output.push(href);
    }

    // Make unique and sort alphabetically
    output = [...new Set(output)].sort();

    return output;
}