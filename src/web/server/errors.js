export class HttpError extends Error {
    constructor(status, message, code = "HTTP_ERROR") {
        super(message);
        this.name = "HttpError";
        this.status = status;
        this.code = code;
    }
}

export class AuthError extends HttpError {
    constructor(message) {
        super(401, message, "AUTH_ERROR");
        this.name = "AuthError";
    }
}

