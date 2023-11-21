const express = require("express");
const { isSeller, isAuthenticated, isAdmin } = require("../middleware/auth");
const router = express.Router();
const Event = require("../model/event");
const Shop = require("../model/shop");
const ErrorHandler = require("../utils/ErrorHandle");
const { upload } = require("../multer");
const fs = require("fs");
const catchAsyncError = require("../middleware/catchAsyncError");
const CoupounCode = require("../model/coupounCode");

//create coupounCode

router.post(
  "/create-coupon-code",
  isSeller,
  catchAsyncError(async (req, res, next) => {
    try {
      const isCoupounCodeExists = await CoupounCode.find({
        name: req.body.name,
      });

      if (isCoupounCodeExists.length !== 0) {
        return next(ErrorHandler("Coupon code already exists!", 400));
      }
      const couponCode = await CoupounCode.create(req.body);

      res.status(201).json({
        success: true,
        couponCode,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

//get all coupoun of shop
router.get(
  "/get-coupon/:id",
  isSeller,
  catchAsyncError(async (req, res, next) => {
    try {
      const couponCodes = await CoupounCode.find({
        shopId: req.seller.id
      });

      res.status(201).json({
        success: true,
        couponCodes,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// //delete product of shop
router.delete(
  "/delete-shop-couponcode/:id",
  isSeller,
  catchAsyncError(async (req, res, next) => {
    try {
      const couponId = req.params.id;

      // const isCoupounCodeExists = await CoupounCode.find({
      //   name: req.body.name,
      // });

      const coupon = await CoupounCode.findByIdAndDelete(couponId);

      if (!coupon) {
        return next(new ErrorHandler("Coupon code not found with this id!", 500));
      }
      // return next(new ErrorHandler("User already exists", 400))

      res.status(201).json({
        success: true,
        message: "Coupon Deleted Successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// get coupon code value by its name
router.get(
  "/get-coupon-value/:name",
  catchAsyncError(async (req, res, next) => {
    try {
      const couponCode = await CoupounCode.findOne({ name: req.params.name });

      res.status(200).json({
        success: true,
        couponCode,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

module.exports = router;
