const express = require("express");
const {
  getShopDetails,
  requireSign,
  placeOrder,
  getUserOrders,
  cancelOrder,
  IsSeller,
  getSellerOrders,
  updateOrderStatus,
  updateOrderStatusWithNotification,
  //getOrderDetails,
} = require("../Controller/OrderController");
const router = express.Router();

// Shop details route (Login Required)
router.get("/ShopOrder/:shopId", requireSign, getShopDetails);

router.post("/place-order", requireSign, placeOrder);

router.get("/get-order", requireSign, getUserOrders);

// Get all orders for the seller
router.get("/seller/orders", requireSign, IsSeller, getSellerOrders);

router.put("/cancel-order/:orderId", requireSign, cancelOrder);

router.put(
  "/notification-order/:orderId",
  requireSign,
  updateOrderStatusWithNotification
);

router.put("/update-order/:orderId", requireSign, IsSeller, updateOrderStatus);

module.exports = router;
