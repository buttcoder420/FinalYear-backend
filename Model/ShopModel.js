const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema(
  {
    shopName: { type: String, required: true },
    location: {
      type: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
      },
      required: true,
    },
    deliveryRange: {
      type: Number,
      required: true,
      enum: [1, 2, 3], // Allowed values: 1, 2, 3
    },
    dairyInfo: { type: String },
    shopOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    shopStatus: {
      type: String,
      enum: ["on", "off"],
      default: "on",
    },
    shopPhoto: [{ type: String }], // Array of image URLs (optional)
  },
  { timestamps: true }
);

module.exports = mongoose.model("Shop", shopSchema);
