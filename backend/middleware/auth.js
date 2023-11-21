const ErrorHandle = require("../utils/ErrorHandle");
const catchAsyncError = require("./catchAsyncError");
const jwt  = require("jsonwebtoken");
const User = require("../model/user");
const Shop = require("../model/shop");

exports.isAuthenticated = catchAsyncError(async(req, res, next)=>{
    const {token}  = req.cookies;

    if(!token){
        return next(new ErrorHandle("Please login to continue", 401));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = await User.findById(decoded.id);
    next();
});

exports.isSeller = catchAsyncError(async(req, res, next)=>{
    const {seller_token}  = req.cookies;

    if(!seller_token){
        return next(new ErrorHandle("Please login to continue", 401));
    }
    const decoded = jwt.verify(seller_token, process.env.JWT_SECRET_KEY);
    req.seller = await Shop.findById(decoded.id);
    next();
});


exports.isAdmin = (...roles) => {
    return (req,res,next) => {
        if(!roles.includes(req.user.role)){
            return next(new ErrorHandle(`${req.user.role} can not access this resources!`))
        };
        next();
    }
}
