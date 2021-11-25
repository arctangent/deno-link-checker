
export async function sleep(milliseconds: number) {
    await new Promise(r => setTimeout(r, milliseconds));
}

export function fullyQualify(root: string, text: string) {
    if (text.startsWith('/')) {
        return root + text;
    } else {
        return text;
    }
}
