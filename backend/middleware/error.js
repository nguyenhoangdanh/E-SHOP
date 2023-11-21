const ErrorHandle = require("../utils/ErrorHandle")
module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || "Internal server Error"

    //wrong mongofb id  error
    if (err.name === "CastError") {
        const message = `Resources not found with id...Invalid ${err.path}`
    }

    //Duplicate key error
    if (err.code === 11000) {
        const message = `Duplicate key ${Object.keys(err.keyValue)} Entered`
    }

    //wrong jwt Error
    if (err.name === "JsonWebTokenError") {
        const message = `Your url is invalid please try again letter`;
        err = new ErrorHandle(message,400);
    }

    //jwt expired
    if (err.name === "TokenExpiredError") {
        const message = `Your Url is expired please try again letter`;
        err = new ErrorHandle(message,400);
    }

    res.status(err.statusCode).json({
        success: false,
        message: err.message,
    })
}