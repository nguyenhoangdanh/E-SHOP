const express = require("express");
const { isSeller, isAuthenticated, isAdmin } = require("../middleware/auth");
const catchAsyncErrors = require("../middleware/catchAsyncError");
const router = express.Router();
const Category = require("../model/categories");
const ErrorHandler = require("../utils/ErrorHandle");
const { upload } = require("../multer");
const fs = require("fs");
const path = require("path");
//create category
router.post(
  "/create-category",
  upload.single("images"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { name, description } = req.body;
      const categoryName = await Category.findOne({ name });

      if (categoryName) {
        const filename = req.file.filename;
        const filePath = `uploads/${filename}`;
        fs.unlink(filePath, (err) => {
          if (err) {
            console.log(err);
            res.status(500).json({ message: "Error deleting file" });
          }
        });
        return next(new ErrorHandler("Category already exists", 400));
      }

      const filename = req.file.filename;
      const fileUrl  = path.join(filename);
      const categoryData = req.body;
      categoryData.images = fileUrl;

      const category = await Category.create(categoryData);

      res.status(201).json({
        success: true,
        category,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// get all category
router.get(
  "/get-all-category",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const category= await Category.find().sort({ createdAt: -1 });

      res.status(201).json({
        success: true,
        category,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);


// delete categories
router.delete(
  "/delete-category/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const category = await Category.findById(req.params.id);

      if (!category) {
        return next(
          new ErrorHandler("Categories is not available with this id", 400)
        );
      }

      await Category.findByIdAndDelete(req.params.id);

      res.status(201).json({
        success: true,
        message: "Category deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);


//Update category
router.put(
  "/update-category",
  isAuthenticated,
  isAdmin("Admin"),
  // upload.single("images"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { name, description } = req.body;
      const category = await Category.findOne(req.params.id);

      // const existsCategory= await User.findById(req.category.id);
      // const existsCategoryPath = `uploads/${existsCategory}`;

      // fs.unlinkSync(existsCategoryPath);

      // const fileUrl = path.join(req.file.filename);
      
      category.name = name;
      category.description = description;
      // category.images = fileUrl;
      await category.save();

      res.status(201).json({
        success: true,
        category,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
