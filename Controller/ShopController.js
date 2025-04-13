const UserModel = require("../Model/UserModel");

const { expressjwt: jwt } = require("express-jwt");
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

// Create a shop
const createShop = async (req, res) => {
  try {
    const { shopName, location, deliveryRange, dairyInfo, shopPhoto } =
      req.body;

    // Ensure user is logged in
    if (!req.auth._id) {
      return res.status(401).json({ message: "Unauthorized! Please login." });
    }

    // Validate delivery range
    if (![1, 2, 3].includes(deliveryRange)) {
      return res
        .status(400)
        .json({ message: "Delivery range must be either 1, 2, or 3." });
    }
    // Check if a shop already exists at the same location
    const existingShop = await ShopModel.findOne({ location });
    if (existingShop) {
      return res
        .status(400)
        .json({ message: "A shop already exists at this location!" });
    }

    // Create a new shop
    const newShop = new ShopModel({
      shopName,
      location,
      deliveryRange,
      dairyInfo,
      shopOwner: req.auth._id,
      shopPhoto,
    });

    // Save shop to database
    await newShop.save();

    res
      .status(201)
      .json({ message: "Shop created successfully!", shop: newShop });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating shop", error: error.message });
  }
};
const getUserShop = async (req, res) => {
  try {
    // Ensure user is logged in
    if (!req.auth._id) {
      return res.status(401).json({ message: "Unauthorized! Please login." });
    }

    // Find the shop associated with the logged-in user
    const userShop = await ShopModel.findOne({ shopOwner: req.auth._id });

    // Check if shop exists
    if (!userShop) {
      return res.status(404).json({ message: "Shop not found for this user." });
    }

    res.status(200).json({ shop: userShop });
  } catch (error) {
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

const updateShop = async (req, res) => {
  try {
    const {
      shopName,
      location,
      deliveryRange,
      dairyInfo,
      shopPhoto,
      shopStatus,
    } = req.body;

    if (!req.auth._id) {
      return res.status(401).json({ message: "Unauthorized! Please login." });
    }

    const shop = await ShopModel.findOne({ shopOwner: req.auth._id });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found." });
    }

    // Update shop details
    shop.shopName = shopName || shop.shopName;
    shop.location = location || shop.location;
    shop.deliveryRange = deliveryRange || shop.deliveryRange;
    shop.dairyInfo = dairyInfo || shop.dairyInfo;
    shop.shopPhoto = shopPhoto || shop.shopPhoto;
    if (shopStatus !== undefined) shop.shopStatus = shopStatus;

    await shop.save();
    res.status(200).json({ message: "Shop updated successfully!", shop });
  } catch (error) {
    console.error("Error in updateShop:", error);
    res
      .status(500)
      .json({ message: "Error updating shop", error: error.message });
  }
};

const deleteShop = async (req, res) => {
  try {
    // Ensure user is logged in
    if (!req.auth._id) {
      return res.status(401).json({ message: "Unauthorized! Please login." });
    }

    // Find and delete the shop
    const shop = await ShopModel.findOneAndDelete({ shopOwner: req.auth._id });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found." });
    }

    res.status(200).json({ message: "Shop deleted successfully!" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting shop", error: error.message });
  }
};

const getShopStatus = async (req, res) => {
  try {
    if (!req.auth._id) {
      return res.status(401).json({ message: "Unauthorized! Please login." });
    }

    const shop = await ShopModel.findOne({ shopOwner: req.auth._id });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found." });
    }

    res.status(200).json({ shopStatus: shop.shopStatus });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching shop status", error: error.message });
  }
};

const updateShopStatus = async (req, res) => {
  try {
    if (!req.auth._id) {
      return res.status(401).json({ message: "Unauthorized! Please login." });
    }

    const { shopStatus } = req.body;

    const shop = await ShopModel.findOne({ shopOwner: req.auth._id });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found." });
    }

    shop.shopStatus = shopStatus;
    await shop.save();

    res.status(200).json({
      message: "Shop status updated successfully!",
      shopStatus: shop.shopStatus,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating shop status", error: error.message });
  }
};
const getAllShops = async (req, res) => {
  try {
    // Fetch all shops with owner details
    const shops = await ShopModel.find()
      .populate("shopOwner", "firstName lastName email") // Fetch shop owner details
      .select("shopName location deliveryRange dairyInfo shopPhoto shopStatus");

    // Check if no shops found
    if (!shops || shops.length === 0) {
      return res.status(404).json({ message: "No shops found." });
    }

    res.status(200).json({ TotalShop: shops.length, shops });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching shops", error: error.message });
  }
};

module.exports = {
  requireSign,
  IsSeller,
  createShop,
  getUserShop,
  updateShop,
  getShopStatus,
  updateShopStatus,
  deleteShop,
  getAllShops,
};
