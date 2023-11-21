class ErrorHandle extends Error{
    constructor(message, statusCode){
        super(message, {
            secretOrKey: process.env.ACTIVATION_SECRET,
          });
        this.statusCode = statusCode;

        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = ErrorHandle;