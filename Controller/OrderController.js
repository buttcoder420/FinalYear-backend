const OrderModel = require("../Model/OrderModel");
const ProductModel = require("../Model/ProductModel");
const ShopModel = require("../Model/ShopModel");
const { expressjwt: jwt } = require("express-jwt");
const UserModel = require("../Model/UserModel");
const nodemailer = require("nodemailer");

// Email transporter configuration (reuse from your working setup)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
// Update Order Status with Email Notification
const updateOrderStatusWithNotification = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    // Validate input
    if (!orderId || !status) {
      return res.status(400).json({
        success: false,
        message: "Order ID and status are required",
      });
    }

    // Find the order and populate user details
    const order = await OrderModel.findById(orderId).populate("user");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Save previous status
    const previousStatus = order.status;
    order.status = status;
    order.updatedAt = new Date();

    // Add to status history
    if (!order.statusHistory) {
      order.statusHistory = [];
    }
    order.statusHistory.push({
      status,
      changedAt: new Date(),
      changedBy: req.auth._id,
    });

    await order.save();

    if (
      status === "shipped" &&
      previousStatus !== "shipped" &&
      order.user.email
    ) {
      try {
        const mailOptions = {
          from: `"Your Store" <${process.env.EMAIL_USER}>`,
          to: order.user.email, // Email of the user who placed the order
          subject: `Your Order #${order._id} Has Been Shipped!`,
          html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4CAF50;">Hello ${order.user.firstName},</h2>
            <p>Your order has been shipped and is on its way to you!</p>
            
            <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Order Details</h3>
              <p><strong>Order ID:</strong> ${order._id}</p>
              <p><strong>Status:</strong> Shipped</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <p>Go to the App and Check your order live:</p>
          
            
            <p style="margin-top: 30px;">Thank you for shopping with us!</p>
            <p><strong>Customer Support Team</strong></p>
          </div>
          `,
        };

        // Send email
        await transporter.sendMail(mailOptions);
        console.log(`Shipping notification sent to ${order.user.email}`);
      } catch (emailError) {
        console.error("Failed to send shipping notification:", emailError);
        // Continue even if email fails
      }
    }

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// JWT Authentication Middlewa    re
const requireSign = [
  jwt({
    secret: process.env.JWT_SECRET,
    algorithms: ["HS256"],
  }),
  (err, req, res, next) => {
    if (err && err.name === "UnauthorizedError") {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or missing token" });
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

// Get Shop Details
const getShopDetails = async (req, res) => {
  try {
    const { shopId } = req.params;
    if (!shopId) {
      return res
        .status(400)
        .json({ success: false, message: "Shop ID is required" });
    }

    const shop = await ShopModel.findById(shopId).populate("shopOwner");
    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }

    const products = await ProductModel.find({
      sellerUser: shop.shopOwner._id,
    });

    return res.status(200).json({
      success: true,
      shop: {
        ...shop.toObject(),
        owner: {
          firstName: shop.shopOwner.firstName,
          lastName: shop.shopOwner.lastName,
          email: shop.shopOwner.email,
          phoneNumber: shop.shopOwner.phoneNumber,
          whatsappNumber: shop.shopOwner.whatsappNumber,
          address: shop.shopOwner.address,
        },
      },
      products,
    });
  } catch (error) {
    console.error("Error fetching shop details:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Place Order with Location Handling
const placeOrder = async (req, res) => {
  try {
    const { shopId, productId, quantity, deliveryLocation } = req.body;

    const userId = req.auth._id;

    // Input Validation
    if (!shopId || !productId || !quantity || !deliveryLocation) {
      return res.status(400).json({
        success: false,
        message:
          "All fields are required (shopId, productId, quantity, deliveryLocation)",
      });
    }

    // Validate location data
    if (
      !deliveryLocation.coordinates ||
      !Array.isArray(deliveryLocation.coordinates) ||
      deliveryLocation.coordinates.length !== 2 ||
      !deliveryLocation.address ||
      !deliveryLocation.placeId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid location data. Must include coordinates [longitude, latitude], address, and placeId",
      });
    }

    // Validate coordinates
    const [longitude, latitude] = deliveryLocation.coordinates;
    if (
      isNaN(longitude) ||
      isNaN(latitude) ||
      longitude < -180 ||
      longitude > 180 ||
      latitude < -90 ||
      latitude > 90
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid coordinates. Longitude must be between -180 and 180, latitude between -90 and 90",
      });
    }

    if (quantity < 1 || quantity > 100) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be between 1-100",
      });
    }

    // Check shop existence
    const shop = await ShopModel.findById(shopId);
    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }

    // Check product existence and ownership
    const product = await ProductModel.findOne({
      _id: productId,
      sellerUser: shop.shopOwner,
    });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found or doesn't belong to this shop",
      });
    }

    // Check product stock if available
    if (product.stock !== undefined && product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} units available`,
      });
    }

    const totalPrice = product.price * quantity;

    const newOrder = new OrderModel({
      user: userId,
      shop: shopId,
      product: productId,
      quantity,
      pricePerUnit: product.price,
      totalPrice,
      status: "pending",
      paymentMethod: req.body.paymentMethod || "Cash on Delivery",
      deliveryLocation: {
        type: "Point",
        coordinates: deliveryLocation.coordinates,
        address: deliveryLocation.address,
        placeId: deliveryLocation.placeId,
      },
    });

    await newOrder.save();

    // Update product stock if applicable
    if (product.stock !== undefined) {
      product.stock -= quantity;
      await product.save();
    }

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: newOrder,
    });
  } catch (error) {
    console.error("Order placement error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to place order",
    });
  }
};

// Get Orders for Logged-in User with Location Data
const getUserOrders = async (req, res) => {
  try {
    const userId = req.auth._id;

    const orders = await OrderModel.find({ user: userId })
      .populate({
        path: "user",
        select: "firstName lastName phoneNumber city",
      })
      .populate({
        path: "product",
        select: "name price images",
      })
      .populate("shop", "shopName shopPhoto");

    if (!orders.length) {
      return res.status(404).json({
        success: false,
        message: "No orders found for this user",
      });
    }

    const formattedOrders = orders.map((order) => ({
      _id: order._id,
      status: order.status,
      quantity: order.quantity,
      pricePerUnit: order.pricePerUnit,
      totalPrice: order.totalPrice,
      createdAt: order.createdAt,
      deliveryLocation: {
        coordinates: order.deliveryLocation.coordinates,
        address: order.deliveryLocation.address,
        placeId: order.deliveryLocation.placeId,
      },
      product: {
        _id: order.product._id,
        name: order.product.name,
        price: order.product.price,
        // ✅ Ab saari images array mein return hongi, chahe ek ho ya multiple
        images: order.product.images || [], // Empty array if images is null/undefined
      },
      shop: {
        _id: order.shop._id,
        shopName: order.shop.shopName,
        shopPhoto: order.shop.shopPhoto,
      },
      userDetails: {
        firstName: order.user.firstName,
        lastName: order.user.lastName,
        phoneNumber: order.user.phoneNumber,
        city: order.user.city,
      },
    }));

    return res.status(200).json({
      success: true,
      message: "User orders fetched successfully",
      orders: formattedOrders,
    });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user orders",
    });
  }
};
// Cancel Order with Location Data Preservation
const cancelOrder = async (req, res) => {
  try {
    const userId = req.auth._id;
    const { orderId } = req.params;

    // Check if order exists and belongs to the logged-in user
    const order = await OrderModel.findOne({ _id: orderId, user: userId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or doesn't belong to you",
      });
    }

    // Check if order is already cancelled or delivered
    if (order.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Order is already cancelled",
      });
    }

    if (order.status === "delivered") {
      return res.status(400).json({
        success: false,
        message: "Delivered orders cannot be cancelled",
      });
    }

    // Update order status to "cancelled" while preserving location data
    order.status = "cancelled";
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      order: {
        ...order.toObject(),
        deliveryLocation: {
          coordinates: order.deliveryLocation.coordinates,
          address: order.deliveryLocation.address,
          placeId: order.deliveryLocation.placeId,
        },
      },
    });
  } catch (error) {
    console.error("Order cancellation error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Seller Orders - Get all orders for a seller's shop
const getSellerOrders = async (req, res) => {
  try {
    const sellerId = req.auth._id; // Authenticated Seller User ID

    // Find the shop owned by the seller
    const shop = await ShopModel.findOne({ shopOwner: sellerId });

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found for this seller",
      });
    }

    // Find all products of this seller
    const products = await ProductModel.find({ sellerUser: sellerId }).select(
      "_id"
    );

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No products found for this seller",
      });
    }

    // Get all orders that contain these products
    const orders = await OrderModel.find({
      product: { $in: products.map((p) => p._id) },
    })
      .populate({
        path: "user",
        select: "firstName lastName phoneNumber email whatsappNumber address",
      })
      .populate({
        path: "product",
        select: "name price images quantity  category",
      })
      .populate("shop", "shopName shopPhoto");

    if (!orders.length) {
      return res.status(404).json({
        success: false,
        message: "No orders found for this seller",
      });
    }

    return res.status(200).json({
      success: true,
      totalOrders: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Error fetching seller orders:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
// Update Order Status (for sellers)

const sendEmail = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // Apna email yahan dalna
        pass: process.env.EMAIL_PASS, // Apna email password yahan dalna
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
    });

    console.log("Email sent successfully!");
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const sellerId = req.auth._id;
    const { orderId } = req.params;
    const { status } = req.body;

    if (!orderId || !status) {
      return res.status(400).json({
        success: false,
        message: "Order ID and status are required",
      });
    }

    const validStatuses = [
      "pending",
      "confirmed",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid status. Must be one of: pending, confirmed, shipped, delivered, cancelled",
      });
    }

    const order = await OrderModel.findById(orderId)
      .populate({ path: "product", select: "sellerUser" })
      .populate({ path: "shop", select: "shopOwner" })
      .populate({ path: "user", select: "email" }); // User ka email get karne ke liye

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const isProductOwner =
      order.product.sellerUser.toString() === sellerId.toString();
    const isShopOwner = order.shop.shopOwner.toString() === sellerId.toString();

    if (!isProductOwner && !isShopOwner) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized. You don't own this product or shop",
      });
    }

    if (order.status === "delivered" && status !== "delivered") {
      return res.status(400).json({
        success: false,
        message: "Delivered orders cannot be changed to other statuses",
      });
    }

    if (order.status === "cancelled" && status !== "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled orders cannot be changed to other statuses",
      });
    }

    order.status = status;
    order.updatedAt = new Date();

    if (!order.statusHistory) {
      order.statusHistory = [];
    }
    order.statusHistory.push({
      status,
      changedAt: new Date(),
      changedBy: sellerId,
    });

    await order.save();

    // Jab status "shipped" ho, tab email bhejna hai
    if (status === "shipped" && order.user.email) {
      const emailText = `Dear customer, your order with ID ${order._id} has been shipped. You will receive it soon.`;
      await sendEmail(
        order.user.email,
        "Your Order Has Been Shipped",
        emailText
      );
    }

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order: {
        _id: order._id,
        status: order.status,
        product: order.product._id,
        shop: order.shop._id,
        statusHistory: order.statusHistory,
      },
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  requireSign,
  updateOrderStatusWithNotification,
  IsSeller,
  updateOrderStatus,
  getShopDetails,
  placeOrder,
  getUserOrders,
  cancelOrder,
  getSellerOrders,
};
