const Messages = require("../model/messages");
const ErrorHandler = require("../utils/ErrorHandle");
const catchAsyncErrors = require("../middleware/catchAsyncError");
const express = require("express");
// const cloudinary = require("cloudinary");
const router = express.Router();
const { upload } = require("../multer");
const { isSeller } = require("../middleware/auth");
const Conversation = require("../model/conversation");
//create new message
router.post(
  "/create-new-message",
  upload.array("images"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const messageData = req.body;
      console.log("file", messageData)
      if (req.files) {
        const files = req.files;
        const imagesUrls = files.map((file) => `${file.filename}`);
        messageData.images = imagesUrls;
      }

      messageData.conversationId = req.body.conversationId;
      messageData.sender = req.body.sender;
      messageData.text = req.body.text;
      
      const message = new Messages({
        conversationId: messageData.conversationId,
        text: messageData.text,
        sender: messageData.sender,
        images: messageData.images ? messageData.images : undefined,
      });

      await message.save();

      res.status(201).json({
        success: true,
        message,
      });
    } catch (error) {
      return next(new ErrorHandler(error.response.message), 500);
    }
  })
);

// //get seller conversation

// router.get(
//   "/get-all-conversation-seller/:id",
//   isSeller,
//   catchAsyncErrors(async (req, res, next) => {
//     try {
//       const conversation = await Conversation.find({
//         members: {
//           $in: [req.params.id],
//         },
//       }).sort({ updatedAt: -1, createdAt: -1 });

//       res.status(201).json({
//         success: true,
//         conversation,
//       });
//     } catch (error) {
//       return next(new ErrorHandler(error), 500);
//     }
//   })
// );

//get all message with conversation id
router.get(
  "/get-all-messages/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const messages = await Messages.find({
        conversationId: req.params.id,
      });

      res.status(201).json({
        success: true,
        messages,
      })
    } catch (error) {
      return next(new ErrorHandler(error.response.message), 500);
    }
  })
);

module.exports = router;
