
export async function sleep(milliseconds: number) {
    await new Promise(r => setTimeout(r, milliseconds));
}

export function paddedRequestCount(requestCount: number) {
    return requestCount.toString().padStart(6, '0');
}
