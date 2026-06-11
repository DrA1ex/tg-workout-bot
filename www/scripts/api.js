let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
    unauthorizedHandler = handler;
}

export async function api(path, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
    };
    const response = await fetch(`/api/${path}`, {
        ...options,
        headers,
        credentials: "same-origin",
    });
    const data = await response.json();
    if (response.status === 401 && unauthorizedHandler) {
        await unauthorizedHandler(data.error);
    }
    if (!response.ok) {
        const error = new Error(data.error || "Request failed");
        error.status = response.status;
        throw error;
    }
    return data;
}

export async function authApi(path, options = {}) {
    const response = await fetch(`/api/auth/${path}`, {
        ...options,
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
        },
    });
    const data = await response.json();
    if (!response.ok) {
        const error = new Error(data.error || "Request failed");
        error.status = response.status;
        throw error;
    }
    return data;
}
