export class DataIntegrityError extends Error {
    constructor(message, options = {}) {
        super(message, options);
        this.name = "DataIntegrityError";
    }
}

export class AlreadyExistsError extends Error {
    constructor(message) {
        super(message);
        this.name = "AlreadyExistsError";
    }
}
