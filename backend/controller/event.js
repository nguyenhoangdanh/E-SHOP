const express = require("express");
const { isSeller, isAuthenticated, isAdmin } = require("../middleware/auth");
const catchAsyncErrors = require("../middleware/catchAsyncError");
const router = express.Router();
const Event = require("../model/event");
// const Order = require("../model/order");
const Shop = require("../model/shop");
const ErrorHandler = require("../utils/ErrorHandle");
const { upload } = require("../multer");
const fs = require("fs")
//create event
router.post(
  "/create-event",
  upload.array("images"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const shopId = req.body.shopId;
      const shop = await Shop.findById(shopId);

      if (!shop) {
        return next(new ErrorHandler("Shop Id is invalid", 400));
      } else {
        const files = req.files;
        const imageUrls = files.map((file) => `${file.filename}`);
        const eventData = req.body;
        eventData.images = imageUrls;
        eventData.shop = shop;

        const event = await Event.create(eventData);

        res.status(201).json({
          success: true,
          event,
        });
      }
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// get all events of shop
router.get(
  "/get-all-events/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const events = await Event.find({ shopId: req.params.id });

      res.status(201).json({
        success: true,
        events,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// //delete product of shop
router.delete(
  "/delete-shop-event/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const productId = req.params.id;
      const eventData = await Event.findById(productId);

      eventData.images.forEach((imageUrl) => {
        const filename = imageUrl;
        const filePath =  `uploads/${filename}`;

        fs.unlink(filePath, (err) => {
            if (err) {
                console.log(err)
                res.status(500).json({message: "Error deleting file"});
            }
        })
       })

      const event = await Event.findByIdAndDelete(productId);

      if (!event) {
        return next(new ErrorHandler("Product not found with this id!", 500));
      }
      // return next(new ErrorHandler("User already exists", 400))

      res.status(201).json({
        success: true,
        message: "Product Deleted Successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);


// get all events
router.get("/get-all-events", async (req, res, next) => {
  try {
    const events = await Event.find();
    res.status(201).json({
      success: true,
      events,
    });
  } catch (error) {
    return next(new ErrorHandler(error, 400));
  }
});


// all events --- for admin
router.get(
  "/admin-all-events",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const events = await Event.find().sort({
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        events,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);


module.exports = router;
