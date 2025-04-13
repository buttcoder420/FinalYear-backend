const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    sellerUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },

    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    quantity: {
      type: String,
      required: true,
      enum: ["in stock", "out of stock"],
      default: "in stock",
    },
    category: {
      type: String,
      enum: ["Milk", "Cheese", "Butter", "Yogurt", "Cream", "Other"],
      required: true,
    },
    images: [
      {
        // Changed from 'image' to 'images' as an array
        type: String,
        required: true,
      },
    ],
  },
  { timeseries: true }
);

module.exports = mongoose.model("products", productSchema);
