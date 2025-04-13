const { expressjwt: jwt } = require("express-jwt");
const UserModel = require("../Model/UserModel");
const RatingModel = require("../Model/RatingModel");
const ProductModel = require("../Model/ProductModel");
// Get average rating for logged-in seller
const mongoose = require("mongoose");
const ShopModel = require("../Model/ShopModel");

const requireSign = [
  jwt({
    secret: process.env.JWT_SECRET,
    algorithms: ["HS256"],
  }),
  (err, req, res, next) => {
    if (err && err.name === "UnauthorizedError") {
      return res.status(401).json({ message: "Invalid or missing token" });
    }
    next();
  },
];

const IsSeller = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.auth._id);
    if (!user || user.userField !== "seller") {
      return res.status(403).json({ message: "Access denied! Sellers only." });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: "Server error: " + error.message });
  }
};
// Add rating by logged in user
const createRating = async (req, res) => {
  try {
    const { product, rating, comment, images } = req.body;
    const user = req.auth._id;

    // Check if user already rated this product
    const existingRating = await RatingModel.findOne({ product, user });
    if (existingRating) {
      return res
        .status(400)
        .json({ message: "You already rated this product." });
    }

    const newRating = new RatingModel({
      product,
      user,
      rating,
      comment,
      images,
    });

    await newRating.save();

    res
      .status(201)
      .json({ message: "Rating added successfully", rating: newRating });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// Now your existing code remains the same
const getUserRatedProducts = async (req, res) => {
  try {
    const userId = req.auth._id;

    // Get ratings of the logged-in user
    const ratings = await RatingModel.find({ user: userId })
      .populate({
        path: "product",
        select: "name price images description",
        model: ProductModel, // Use the ProductModel here instead of "Product"
      })
      .sort({ createdAt: -1 });

    // Filter out ratings where product is null (e.g. if the product is deleted)
    const ratedProducts = ratings
      .filter((rating) => rating.product !== null) // Only include ratings where product exists
      .map((rating) => ({
        product: rating.product,
        rating: rating.rating,
        comment: rating.comment,
        images: rating.images,
        ratedAt: rating.createdAt,
      }));

    // If no rated products exist, handle gracefully
    if (ratedProducts.length === 0) {
      return res
        .status(404)
        .json({ message: "No products rated by this user." });
    }

    // Respond with the rated products
    res.status(200).json({
      total: ratedProducts.length,
      ratedProducts,
    });
  } catch (err) {
    console.error("❌ Error in getUserRatedProducts:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

// Get all ratings for a product
const getRatingsForProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const ratings = await RatingModel.find({ product: productId })
      .populate("user", "username email") // show user details
      .sort({ createdAt: -1 });

    res.status(200).json(ratings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching ratings" });
  }
};

// Get all ratings by a user
const getRatingsByUser = async (req, res) => {
  try {
    const { userId } = req.auth._id;

    const ratings = await RatingModel.find({ user: userId })
      .populate("product", "name price") // show product details
      .sort({ createdAt: -1 });

    res.status(200).json(ratings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching user ratings" });
  }
};
const getAverageRatingByShop = async (req, res) => {
  try {
    const { shopId } = req.params;
    console.log("➡️ Step 1: shopId received:", shopId);

    // Step 2: Get the shop
    const shop = await ShopModel.findById(shopId);
    if (!shop) {
      console.log("❌ Step 2: Shop not found");
      return res.status(404).json({ message: "Shop not found." });
    }
    console.log("🏪 Step 2: Shop found:", shop);

    // Step 3: Get the shop owner
    const shopOwnerId = shop.shopOwner;
    console.log("👤 Step 3: shopOwner ID:", shopOwnerId);

    // Step 4: Find the shop owner from User model
    const owner = await UserModel.findById(shopOwnerId);
    if (!owner) {
      console.log("❌ Step 4: Shop owner not found");
      return res.status(404).json({ message: "Shop owner not found." });
    }
    console.log("✅ Step 4: Shop owner found:", owner);

    // Step 5: Get all products owned by this shop owner (using sellerUser instead of shopOwner)
    const products = await ProductModel.find({
      sellerUser: shopOwnerId,
    }).select("_id");
    if (products.length === 0) {
      console.log("❌ Step 5: No products found for this shop owner.");
      return res
        .status(404)
        .json({ message: "No products found for this shop owner." });
    }
    const productIds = products.map((p) => p._id);
    console.log("🛒 Step 5: Product IDs found:", productIds);

    // Step 6: Get all ratings for these products
    const ratings = await RatingModel.find({ product: { $in: productIds } });
    if (ratings.length === 0) {
      console.log("⚠️ Step 6: No ratings found for products.");
      return res.status(200).json({
        shopId,
        owner: owner.username,
        totalRatedProducts: 0,
        totalRatings: 0,
        averageRating: 0,
      });
    }
    console.log("⭐ Step 6: Ratings found:", ratings);

    // Step 7: Calculate average rating
    const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / ratings.length;

    console.log("📊 Step 7: Average rating calculated:", averageRating);

    // Step 8: Respond with data
    res.status(200).json({
      shopId,
      owner: owner.username,
      totalRatedProducts: new Set(ratings.map((r) => r.product.toString()))
        .size,
      totalRatings: ratings.length,
      averageRating: averageRating.toFixed(2),
    });
  } catch (err) {
    console.error("❌ Error in getAverageRatingByShop:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

module.exports = {
  requireSign,
  IsSeller,
  getRatingsByUser,
  getRatingsForProduct,
  createRating,
  getAverageRatingByShop,
  getUserRatedProducts,
};
