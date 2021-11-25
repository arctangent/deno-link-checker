
export async function sleep(milliseconds: number) {
    await new Promise(r => setTimeout(r, milliseconds));
}
