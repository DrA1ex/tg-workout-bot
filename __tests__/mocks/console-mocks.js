import { jest } from '@jest/globals';

/**
 * Temporarily silence console methods to avoid noisy test output.
 * Usage:
 *   const restore = silenceConsole(['error', 'warn']);
 *   try { ... } finally { restore(); }
 */
export function silenceConsole(methods = ['error']) {
    const originals = {};
    for (const method of methods) {
        originals[method] = console[method];
        console[method] = jest.fn();
    }

    return function restoreConsole() {
        for (const method of methods) {
            console[method] = originals[method];
        }
    };
}

/**
 * Wrap a describe-block so all its tests run with selected console methods silenced.
 */
export function describeWithSilencedConsole(name, methods, fn) {
    return describe(name, () => {
        let restore;
        beforeEach(() => {
            // Lazily import to avoid circular imports in some runners
            restore = silenceConsole(methods);
        });
        afterEach(() => {
            if (restore) restore();
        });
        fn();
    });
}


