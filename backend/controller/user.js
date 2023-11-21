const express = require("express");
const path = require("path");
const router = express.Router();
const User = require("../model/user");
const { upload } = require("../multer");
const ErrorHandle = require("../utils/ErrorHandle");
const catchAsyncError = require("../middleware/catchAsyncError");
const fs = require("fs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const sendMail = require("../utils/sendMail");
const sendToken = require("../utils/jwtToken");
const { isAuthenticated, isAdmin } = require("../middleware/auth");
const sendMailReset = require("../utils/sendMailReset");

router.post("/create-user", upload.single("file"), async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const userEmail = await User.findOne({ email });

    if (userEmail) {
      const filename = req.file.filename;
      const filePath = `uploads/${filename}`;
      fs.unlink(filePath, (err) => {
        if (err) {
          console.log(err);
          res.status(500).json({ message: "Error deleting file" });
        }
      });
      return next(new ErrorHandle("User already exists", 400));
    }
    const filename = req.file.filename;
    const fileUrl = path.join(filename);

    const user = {
      name: name,
      email: email,
      password: password,
      avatar: fileUrl,
    };

    const activationToken = createActivationToken(user);

    const activationUrl = `http://localhost:3000/activation/${activationToken}`;
    try {
      await sendMail({
        email: user.email,
        subject: "Activate your account",
        message: `Hello ${user.name}, please click on the link to activate your account: ${activationUrl}`,
      });
      res.status(201).json({
        success: true,
        message: `please check your email:- ${user.email} to  activate your account`,
      });
    } catch (error) {
      return next(new ErrorHandle(error.message, 500));
    }
  } catch (error) {
    return next(new ErrorHandle(error.message, 400));
  }
});

const createActivationToken = (user) => {
  return jwt.sign(user, process.env.ACTIVATION_SECRET, {
    expiresIn: "5m",
  });
};

//active user
router.post(
  "/activation",
  catchAsyncError(async (req, res, next) => {
    try {
      const { activation_token } = req.body;
      const newUser = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET
      );

      if (!newUser) {
        return next(new ErrorHandle("Invalid token", 400));
      }
      const { name, email, password, avatar } = newUser;

      let user = await User.findOne({ email });

      if (user) {
        return next(new ErrorHandle("User already exists", 400));
      }

      user = await User.create({
        name,
        email,
        password,
        avatar,
      });

      sendToken(user, 201, res);
    } catch (error) {
      return next(new ErrorHandle(error.message, 500));
    }
  })
);

//Login user
router.post(
  "/login-user",
  catchAsyncError(async (req, res, next) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return next(new ErrorHandle("Please provide the all fields", 400));
      }
      // else if(!email){
      //     return next(new ErrorHandle("Email is required", 400))
      // }
      // else{
      //     return next(new ErrorHandle("Password is required", 400))
      // };

      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandle("User doesn't exists", 400));
      }
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return next(
          new ErrorHandle("Please provide the correct infomation", 400)
        );
      }
      sendToken(user, 201, res);
    } catch (error) {
      return next(new ErrorHandle(error.message, 500));
    }
  })
);

//Load user
router.get(
  "/getUser",
  isAuthenticated,
  catchAsyncError(async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);

      if (!user) {
        return next(new ErrorHandle("User doesn't exists", 400));
      }
      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandle(error.message, 500));
    }
  })
);

//logout user
router.get(
  "/logout",
  isAuthenticated,
  catchAsyncError(async (req, res, next) => {
    try {
      res.cookie("token", null, {
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

//Update userInfo
router.put(
  "/update-user-info",
  isAuthenticated,
  catchAsyncError(async (req, res, next) => {
    try {
      const { email, password, phoneNumber, name } = req.body;
      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandle("User not found", 400));
      }

      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return next(
          new ErrorHandle("Please provide the correct infomation", 400)
        );
      }

      user.name = name;
      user.email = email;
      user.phoneNumber = phoneNumber;

      await user.save();

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandle(error.message, 500));
    }
  })
);

//update user avatar
router.put(
  "/update-avatar",
  isAuthenticated,
  upload.single("image"),
  catchAsyncError(async (req, res, next) => {
    try {
      const existsUser = await User.findById(req.user.id);
      const existsAvatarPath = `uploads/${existsUser.avatar}`;

      fs.unlinkSync(existsAvatarPath);

      const fileUrl = path.join(req.file.filename);

      const user = await User.findByIdAndUpdate(req.user.id, {
        avatar: fileUrl,
      });
      res.status(200).json({
        success: true,
        user: existsUser,
      });
    } catch (error) {
      return next(new ErrorHandle(error.message, 500));
    }
  })
);

//update user address
router.put(
  "/update-user-addresses",
  isAuthenticated,
  catchAsyncError(async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);
      const sameTypeAddress = user.addresses.find(
        (address) => address.addressType === req.body.addressType
      );
      if (sameTypeAddress) {
        return next(
          new ErrorHandle(`${req.body.addressType} address already exists!`)
        );
      }
      const existsAddress = user.addresses.find(
        (address) => address._id === req.body._id
      );
      
      if (existsAddress) {
        Object.assign(existsAddress, req.body);
      } else {
        //add the new address
        user.addresses.push(req.body);
      }
      await user.save();
      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandle(error.message, 500));
    }
  })
);

// delete user address
router.delete(
  "/delete-user-address/:id",
  isAuthenticated,
  catchAsyncError(async (req, res, next) => {
    try {
      const userId = req.user._id;
      const addressId = req.params.id;

      await User.updateOne(
        {
          _id: userId,
        },
        { $pull: { addresses: { _id: addressId } } }
      );

      const user = await User.findById(userId);

      res.status(200).json({ success: true, user });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update user password
router.put(
  "/update-user-password",
  isAuthenticated,
  catchAsyncError(async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id).select("+password");
      const isPasswordMatched = await user.comparePassword(
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
      user.password = req.body.newPassword;

      await user.save();

      res.status(200).json({
        success: true,
        message: "Password updated successfully!",
      });
    } catch (error) {
      return next(new ErrorHandle(error.message, 500));
    }
  })
);

//find user infomation with userId
router.get(
  "/user-info/:id",
  catchAsyncError(async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id);

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandle(error.message, 500));
    }
  })
);




//Forgot Password
router.put(
  "/forgot-password",
  catchAsyncError(async (req, res, next) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });

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

      user.password = generatePassword();

      try {
        await sendMailReset({
          email: user.email,
          subject: "Reset Password",
          message: `${user.password}`,
          // message: `Hello ${user.name}, please click on the link to reset pasword: ` + `${newPass}`,
        });
        // res.status(201).json({
        //   success: true,
        //   message: `please check your email:- ${user.email} to  reset password`,
        // });
      } catch (error) {
        return next(new ErrorHandle(error.message, 500));
      }

      await user.save();

      res.status(200).json({
        success: true,
        message: "Password reset successfully!",
      });

     
    } catch (error) {
      return next(new ErrorHandle(error.message, 500));
    }
  })
);

// all users --- for admin
router.get(
  "/admin-all-users",
  isAuthenticated,
  // isAdmin("Admin"),
  catchAsyncError(async (req, res, next) => {
    try {
      const users = await User.find().sort({
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        users,
      });
    } catch (error) {
      return next(new ErrorHandle(error.message, 500));
    }
  })
);

// delete users --- admin
// router.delete(
//   "/delete-user/:id",
//   isAuthenticated,
//   isAdmin("Admin"),
//   catchAsyncError(async (req, res, next) => {
//     try {
//       const user = await User.findById(req.params.id);

//       if (!user) {
//         return next(
//           new ErrorHandle("User is not available with this id", 400)
//         );
//       }

//       const imageId = user.avatar.public_id;

//       await cloudinary.v2.uploader.destroy(imageId);

//       await User.findByIdAndDelete(req.params.id);

//       res.status(201).json({
//         success: true,
//         message: "User deleted successfully!",
//       });
//     } catch (error) {
//       return next(new ErrorHandle(error.message, 500));
//     }
//   })
// );

//Update role user


router.put(
  "/update-user-role",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncError(async (req, res, next) => {
    try {
      const { role, status } = req.body;
      const user = await User.findOne(req.params.id);

      user.role = role;
      user.status = status;
      await user.save();

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandle(error.message, 500));
    }
  })
);

module.exports = router;
