const express = require("express");
const {
  createShop,
  requireSign,
  IsSeller,
  getUserShop,
  updateShop,
  deleteShop,
  getShopStatus,
  updateShopStatus,
  getAllShops,
} = require("../Controller/ShopController");
const router = express.Router();

// Route to create a shop
router.post("/create", requireSign, IsSeller, createShop);

// Get  Shops (For testing)
router.get("/my-shop", requireSign, IsSeller, getUserShop);

// Get All Shops (For testing)
router.get("/all-shop", requireSign, getAllShops);

// // Get Single Shop
// router.get("/shop/:shopId", requireSign, IsSeller, getShopById);
// Route to update a shop
router.put("/update/:shopId", requireSign, IsSeller, updateShop);

// Route to delete a shop
router.delete("/delete/:shopId", requireSign, IsSeller, deleteShop);
router.get("/shop/status", requireSign, IsSeller, getShopStatus);
router.put("/shop/status", requireSign, IsSeller, updateShopStatus);

// // Route to update shop status (on/off)
// router.put("/status/:shopId", requireSign, IsSeller, updateShopStatus);

module.exports = router;
