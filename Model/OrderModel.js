const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "products",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    pricePerUnit: {
      type: Number,
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      default: "Cash on Delivery",
    },
    deliveryLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
      address: {
        type: String,
        required: true,
      },
      placeId: {
        type: String,
        required: true,
      },
    },
  },
  { timestamps: true }
);

// Create geospatial index for efficient location queries
orderSchema.index({ deliveryLocation: "2dsphere" });

module.exports = mongoose.model("Order", orderSchema);
