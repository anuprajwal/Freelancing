
// never used in the program.
// TRASH

class BadRequestError extends Error {
    constructor(message) {
        super(message);
        this.statusCode = 400;
    }
}

class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.statusCode = 404;
    }
}

 class UnauthorizedError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode || 401;
    }
}
module.exports = {BadRequestError , NotFoundError ,UnauthorizedError}