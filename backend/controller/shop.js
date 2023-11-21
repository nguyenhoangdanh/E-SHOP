const express = require("express");
const path = require("path");
const router = express.Router();
const { upload } = require("../multer");
const ErrorHandle = require("../utils/ErrorHandle");
const catchAsyncError = require("../middleware/catchAsyncError");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const sendMail = require("../utils/sendMail");
const sendToken = require("../utils/jwtToken");
const sendShopToken = require("../utils/sendShopToken");
const { isAuthenticated, isSeller, isAdmin } = require("../middleware/auth");
const Shop = require("../model/shop");
const sendMailReset = require("../utils/sendMailReset");
const Product = require("../model/product");

router.post("/create-shop", upload.single("file"), async (req, res, next) => {
  try {
    const { email } = req.body;
    const sellerEmail = await Shop.findOne({ email });

    if (sellerEmail) {
      const filename = req.file.filename;
      const filePath = `uploads/${filename}`;
      fs.unlink(filePath, (err) => {
        if (err) {
          console.log(err);
          res.status(500).json({ messgage: "Error deleting file" });
        }
      });
      return next(new ErrorHandle("User already exists", 400));
    }

    const filename = req.file.filename;
    const fileUrl = path.join(filename);

    const seller = {
      name: req.body.name,
      email: email,
      password: req.body.password,
      avatar: fileUrl,
      // addresses: req.body.address,
      phoneNumber: req.body.phoneNumber,
    };

    const activationToken = createActivationToken(seller);

    const activationUrl = `http://localhost:3000/seller/activation/${activationToken}`;

    try {
      await sendMail({
        email: seller.email,
        subject: "Activate your Shop",
        message: `Hello ${seller.name}, please click on the link to activate your account: ${activationUrl}`,
      });
      res.status(201).json({
        success: true,
        message: `please check your email:- ${seller.email} to  activate your account`,
      });
    } catch (error) {
      return next(new ErrorHandle(error.message, 500));
    }
  } catch (error) {
    return next(new ErrorHandle(error.message, 400));
  }
});

const createActivationToken = (seller) => {
  return jwt.sign(seller, process.env.ACTIVATION_SECRET, {
    expiresIn: "5m",
  });
};

//active shop
router.post(
  "/activation",
  catchAsyncError(async (req, res, next) => {
    try {
      const { activation_token } = req.body;
      const newSeller = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET
      );

      if (!newSeller) {
        return next(new ErrorHandle("Invalid token", 400));
      }
      const { name, email, password, avatar, phoneNumber } = newSeller;

      let seller = await Shop.findOne({ email });

      if (seller) {
        return next(new ErrorHandle("Seller already exists", 400));
      }

      seller = await Shop.create({
        name,
        email,
        password,
        avatar,
        phoneNumber,
      });

      sendShopToken(seller, 201, res);
    } catch (error) {
      return next(new ErrorHandle(error.message, 500));
    }
  })
);

//Login Seller
router.post(
  "/login-shop",
  catchAsyncError(async (req, res, next) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return next(new ErrorHandle("Please provide the all fields", 400));
      }

      const seller = await Shop.findOne({ email }).select("+password");

      if (!seller) {
        return next(new ErrorHandle("Seller doesn't exists", 400));
      }
      const isPasswordValid = await seller.comparePassword(password);
      if (!isPasswordValid) {
        return next(
          new ErrorHandle("Please provide the correct infomation", 400)
        );
      }
      sendShopToken(seller, 201, res);
    } catch (error) {
      return next(new ErrorHandle(error.message, 500));
    }
  })
);

//Load shop
router.get(
  "/getSeller",
  isSeller,
  catchAsyncError(async (req, res, next) => {
    try {
      const seller = await Shop.findById(req.seller._id);

      if (!seller) {
        return next(new ErrorHandle("Seller doesn't exists", 400));
      }
      res.status(200).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandle(error.message, 500));
    }
  })
);

//Forgot Password
router.put(
  "/shop-forgot-password",
  catchAsyncError(async (req, res, next) => {
    try {
      const { email } = req.body;
      const shop = await Shop.findOne({ email });

      if (!email) {
        return next(new ErrorHandle("Please provide the email", 400));
      }
      const crypto = require("crypto");

      const generatePassword = (
        length = 20,
        characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~!@-#$"
      ) =>
        Array.from(crypto.randomFillSync(new Uint32Array(length)))
          .map((x) => characters[x % characters.length])
          .join("");

      shop.password = generatePassword();

      try {
        await sendMailReset({
          email: shop.email,
          subject: "Reset Password",
          message: `${shop.password}`,
          // message: `Hello ${user.name}, please click on the link to reset pasword: ` + `${newPass}`,
        });
      } catch (error) {
        return next(new ErrorHandle(error.message, 500));
      }

      await shop.save();

      res.status(200).json({
        success: true,
        message: "Password reset successfully!",
      });
    } catch (error) {
      return next(new ErrorHandle(error.message, 500));
    }
  })
);

// update shop password
router.put(
  "/update-shop-password",
  isSeller,
  catchAsyncError(async (req, res, next) => {
    try {
      const shop = await Shop.findById(req.seller._id).select("+password");
      const isPasswordMatched = await shop.comparePassword(
        req.body.oldPassword
      );

      if (!isPasswordMatched) {
        return next(new ErrorHandle("Old password is incorrect!", 400));
      }

      if (req.body.newPassword !== req.body.confirmPassword) {
        return next(
          new ErrorHandle("Password doesn't matched with each other!", 400)
        );
      }
      shop.password = req.body.newPassword;

      await shop.save();

      res.status(200).json({
        success: true,
        message: "Password updated successfully!",
      });
    } catch (error) {
      return next(new ErrorHandle(error.message, 500));
    }
  })
);

//logout from shop
router.get(
  "/logout",
  isSeller,
  catchAsyncError(async (req, res, next) => {
    try {
      res.cookie("seller_token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
        sameSite: "none",
        secure: true,
      });
      res.status(201).json({
        success: true,
        message: "Log out Successfully!",
      });
    } catch (error) {
      return next(new ErrorHandle(error.message, 500));
    }
  })
);

//get shop info
router.get(
  "/get-shop-info/:id",
  catchAsyncError(async (req, res, next) => {
    try {
      const shop = await Shop.findById(req.params.id);
      res.status(201).json({
        success: true,
        shop,
      });
    } catch (error) {
      return next(new ErrorHandle(error.message, 500));
    }
  })
);

// update shop profile picture
router.put(
  "/update-shop-avatar",
  isSeller,
  upload.single("image"),
  catchAsyncError(async (req, res, next) => {
    try {
      const products = await Product.find({ shopId: req.seller._id });
      const existsSeller = await Shop.findById(req.seller._id);
      const existsAvatarPath = `uploads/${existsSeller.avatar}`;
      const shop = await Shop.findById(req.params.id);

      fs.unlinkSync(existsAvatarPath);
      const fileUrl = path.join(req.file.filename);
      const seller = await Shop.findByIdAndUpdate(req.seller._id, {
        avatar: fileUrl,
      });

      for (let key in products) {
        let value = products[key]; // get the value by key
        await Product.findByIdAndUpdate(value._id, {
          shop: {
            _id: value.shop._id,
            name: value.shop.name,
            email: value.shop.email,
            phoneNumber: value.shop.phoneNumber,
            address: value.shop.address,
            role: value.shop.role,
            avatar: fileUrl,
            createdAt: value.shop.createdAt,
            __v: value.shop.__v,
            availableBalance: value.shop.availableBalance,
            transactions: value.shop.transactions,
            description: value.shop.description,
          },
        });

        // product.shop.avatar = fileUrl;
        // await product.save();
        // console.log("key: %o, value: %o", key, value);
      }

      res.status(200).json({
        success: true,
        seller: existsSeller,
        // products:
      });
    } catch (error) {
      return next(new ErrorHandle(error.message, 500));
    }
  })
);

// update seller info
router.put(
  "/update-seller-info",
  isSeller,
  catchAsyncError(async (req, res, next) => {
    try {
      const {
        name,
        phoneNumber,
        description,
        province,
        district,
        ward,
        address,
      } = req.body;

      const seller = await Shop.findOne(req.seller._id);

      if (!seller) {
        return next(new ErrorHandle("User not found", 400));
      }

      seller.name = name;
      seller.description = description;
      seller.phoneNumber = phoneNumber;

      const existsAddress = seller.addresses[0];
      
      if (existsAddress) {
        seller.addresses.map((i)=>{
          i.province = province,
          i.district = district,
          i.ward = ward
          i.address = address
        })
      } else {
        //add the new address
        seller.addresses.push({province, district, ward, address});
      }

      // console.log('map', seller.addresses)
     
      await seller.save();
      res.status(201).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandle(error.message, 500));
    }
  })
);

// all sellers --- for admin
router.get(
  "/admin-all-sellers",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncError(async (req, res, next) => {
    try {
      const sellers = await Shop.find().sort({
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        sellers,
      });
    } catch (error) {
      return next(new ErrorHandle(error.message, 500));
    }
  })
);

// delete seller ---admin
router.delete(
  "/delete-seller/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncError(async (req, res, next) => {
    try {
      const seller = await Shop.findById(req.params.id);

      if (!seller) {
        return next(
          new ErrorHandle("Seller is not available with this id", 400)
        );
      }

      await Shop.findByIdAndDelete(req.params.id);

      res.status(201).json({
        success: true,
        message: "Seller deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandle(error.message, 500));
    }
  })
);

// update seller withdraw methods --- sellers
router.put(
  "/update-payment-methods",
  isSeller,
  catchAsyncError(async (req, res, next) => {
    try {
      const { withdrawMethod } = req.body;

      const seller = await Shop.findByIdAndUpdate(req.seller._id, {
        withdrawMethod,
      });

      res.status(201).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandle(error.message, 500));
    }
  })
);

// delete seller withdraw merthods --- only seller
router.delete(
  "/delete-withdraw-method/",
  isSeller,
  catchAsyncError(async (req, res, next) => {
    try {
      const seller = await Shop.findById(req.seller._id);

      if (!seller) {
        return next(new ErrorHandle("Seller not found with this id", 400));
      }

      seller.withdrawMethod = null;

      await seller.save();

      res.status(201).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandle(error.message, 500));
    }
  })
);

module.exports = router;
