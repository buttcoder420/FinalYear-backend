const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const RatingSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: "products",
    required: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
  },
  images: [
    {
      type: String,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Rating", RatingSchema);
