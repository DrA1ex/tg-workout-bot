let unauthorizedHandler = null;
let unauthorizedPromise = null;
const DEFAULT_TIMEOUT_MS = 20_000;

export function setUnauthorizedHandler(handler) {
    unauthorizedHandler = handler;
}

async function requestJson(url, options = {}) {
    const controller = new AbortController();
    const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : DEFAULT_TIMEOUT_MS;
    let timedOut = false;
    const timer = window.setTimeout(() => {
        timedOut = true;
        controller.abort(new DOMException("Request timed out", "TimeoutError"));
    }, timeoutMs);
    const externalSignal = options.signal;
    const abortFromExternal = () => controller.abort(externalSignal.reason);
    if (externalSignal) {
        if (externalSignal.aborted) abortFromExternal();
        else externalSignal.addEventListener("abort", abortFromExternal, {once: true});
    }

    try {
        const response = await fetch(url, {
            ...options,
            timeoutMs: undefined,
            signal: controller.signal,
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {}),
            },
        });
        const text = await response.text();
        const contentType = String(response.headers.get("content-type") || "").toLowerCase();
        let data = {};
        if (text) {
            if (contentType.includes("application/json")) {
                try {
                    data = JSON.parse(text);
                } catch {
                    const error = new Error("Server returned invalid JSON");
                    error.status = response.status;
                    throw error;
                }
            } else {
                data = {error: response.ok ? "Unexpected server response" : `Server error (${response.status})`};
            }
        }

        if (response.status === 401 && unauthorizedHandler) {
            unauthorizedPromise ||= Promise.resolve(unauthorizedHandler(data.error)).finally(() => {
                unauthorizedPromise = null;
            });
            await unauthorizedPromise;
        }
        if (!response.ok) {
            const error = new Error(typeof data.error === "string" ? data.error : "Request failed");
            error.status = response.status;
            error.code = data.code;
            throw error;
        }
        return data;
    } catch (error) {
        if (timedOut) {
            const timeoutError = new Error("Request timed out");
            timeoutError.code = "REQUEST_TIMEOUT";
            throw timeoutError;
        }
        throw error;
    } finally {
        window.clearTimeout(timer);
        externalSignal?.removeEventListener("abort", abortFromExternal);
    }
}

export function api(path, options = {}) {
    return requestJson(`/api/${path}`, options);
}

export function authApi(path, options = {}) {
    return requestJson(`/api/auth/${path}`, options);
}
