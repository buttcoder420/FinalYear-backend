const express = require("express");
const router = express.Router();

const {
  requireSign,
  createRating,
  getRatingsForProduct,
  getRatingsByUser,

  getAverageRatingByShop,
  getUserRatedProducts,
} = require("../Controller/RatingController");

// Create a rating (only for logged-in users)
router.post("/rating", requireSign, createRating);

// Get all ratings for a specific product
router.get("/product/:productId", requireSign, getRatingsForProduct);

// Get all ratings made by a specific user
router.get("/user", requireSign, getRatingsByUser);

router.get("/shop-rating/:shopId", requireSign, getAverageRatingByShop);

router.get("/user/rated-products", requireSign, getUserRatedProducts);
module.exports = router;
