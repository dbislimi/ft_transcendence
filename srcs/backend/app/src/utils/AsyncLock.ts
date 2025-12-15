export class AsyncLock {
    private promise: Promise<void>;

    constructor() {
        this.promise = Promise.resolve();
    }

    async acquire<T>(callback: () => Promise<T> | T): Promise<T> {
        let release: () => void;
        const nextPromise = new Promise<void>((resolve) => {
            release = resolve;
        });
        const previousPromise = this.promise;
        this.promise = previousPromise.then(() => nextPromise);
        await previousPromise;

        try {
            return await callback();
        } finally {
            release!();
        }
    }
}
