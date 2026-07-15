const tails = new Map();

export async function withKeyedLock(key, task) {
    const lockKey = String(key);
    const previous = tails.get(lockKey) || Promise.resolve();
    let release;
    const current = new Promise(resolve => {
        release = resolve;
    });
    tails.set(lockKey, current);

    await previous.catch(() => {});
    try {
        return await task();
    } finally {
        release();
        if (tails.get(lockKey) === current) tails.delete(lockKey);
    }
}
