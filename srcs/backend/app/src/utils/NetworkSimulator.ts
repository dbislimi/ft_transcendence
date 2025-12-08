const NETWORK_CONFIG = {
    SIMULATE_LAG: false,
    MIN_LATENCY: 20,
    MAX_JITTER: 30
};

export function withLag(action: () => void) {
    if (!NETWORK_CONFIG.SIMULATE_LAG) {
        action();
        return;
    }
    const delay = NETWORK_CONFIG.MIN_LATENCY + (Math.random() * NETWORK_CONFIG.MAX_JITTER);
    setTimeout(action, delay);
}