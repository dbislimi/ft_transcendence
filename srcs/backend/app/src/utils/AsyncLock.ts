export class AsyncLock {
    private promise: Promise<void>;

    constructor() {
        this.promise = Promise.resolve();
    }

    async acquire<T>(callback: () => Promise<T> | T): Promise<T> {
        let release: () => void;

        // Create a new promise that resolves when the previous one is done
        // and we are ready to execute the callback
        const nextPromise = new Promise<void>((resolve) => {
            release = resolve;
        });

        // Chain the new promise to the existing one
        const previousPromise = this.promise;
        this.promise = previousPromise.then(() => nextPromise);

        // Wait for the previous operation to complete
        await previousPromise;

        try {
            return await callback();
        } finally {
            // Always release the lock
            release!();
        }
    }
}
