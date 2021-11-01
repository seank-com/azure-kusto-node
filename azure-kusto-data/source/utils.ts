export function withTimeout<T>(millis: number, promise: Promise<T>): Promise<T> {
    const timeout = new Promise((_, reject) =>
        setTimeout(
            () => reject(`Timed out after ${millis} ms.`),
            millis));
    return Promise.race([
        promise,
        timeout
    ]) as Promise<T>;
}