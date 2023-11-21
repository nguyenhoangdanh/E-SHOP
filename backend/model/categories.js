const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter your category name!"],
  },
  description: {
    type: String,
    required: [true, "Please enter your category description!"],
  },
  images: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

module.exports = mongoose.model("Categories", categorySchema);
