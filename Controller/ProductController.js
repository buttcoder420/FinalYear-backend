const { expressjwt: jwt } = require("express-jwt");
const ProductModel = require("../Model/ProductModel");
const UserModel = require("../Model/UserModel");
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

const createProduct = async (req, res) => {
  try {
    const { name, description, price, quantity, category, images } = req.body;
    const sellerUser = req.auth._id;

    // Validate required fields
    if (
      !name ||
      !description ||
      !price ||
      !quantity ||
      !category ||
      !images ||
      images.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields including at least one image are required",
      });
    }

    const newProduct = new ProductModel({
      sellerUser,
      name,
      description,
      price: Number(price),
      quantity,
      category,
      images, // Now accepts array of image URLs
    });

    await newProduct.save();

    res.status(201).json({
      success: true,
      message: "Product added successfully!",
      product: newProduct,
    });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({
      success: false,
      message: "Error creating product",
      error: error.message,
    });
  }
};
// ✅ **Get All Products**
const getAllProducts = async (req, res) => {
  try {
    const sellerUser = req.auth._id; // Logged-in user ID
    const products = await ProductModel.find({ sellerUser }) // Filter products by sellerUser
      .populate("sellerUser", "name email");

    res.status(200).json({ success: true, products });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching products",
      error: error.message,
    });
  }
};

// ✅ **Get Single Product by ID**
const getProductById = async (req, res) => {
  try {
    const sellerUser = req.auth._id;
    const product = await ProductModel.findById(req.params.id).populate(
      "sellerUser",
      "name email"
    );
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    res.status(200).json({ success: true, product });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching product",
      error: error.message,
    });
  }
};

// ✅ **Update Product**
const updateProduct = async (req, res) => {
  try {
    const sellerUser = req.auth._id;
    const product = await ProductModel.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Only allow the product owner to update
    if (product.sellerUser.toString() !== sellerUser.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update this product",
      });
    }

    // Define allowed updates including images array
    const allowedUpdates = [
      "name",
      "description",
      "price",
      "quantity",
      "category",
      "images", // Changed from 'image' to 'images' to match your schema
    ];

    // Filter updates to only include allowed fields
    const updates = Object.keys(req.body);
    const isValidUpdate = updates.every((update) =>
      allowedUpdates.includes(update)
    );

    if (!isValidUpdate) {
      return res.status(400).json({
        success: false,
        message: "Invalid update fields!",
      });
    }

    // Prepare update data
    const updateData = {
      ...req.body,
      price: req.body.price ? Number(req.body.price) : product.price,
    };

    // Update the product
    const updatedProduct = await ProductModel.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "Product updated successfully!",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({
      success: false,
      message: "Error updating product",
      error: error.message,
    });
  }
};

// ✅ **Delete Product**
const deleteProduct = async (req, res) => {
  try {
    const sellerUser = req.auth._id; // Corrected here to use req.auth._id
    const product = await ProductModel.findById(req.params.id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    // Only allow owner to delete
    if (product.sellerUser.toString() !== sellerUser.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to delete this product",
      });
    }

    await ProductModel.findByIdAndDelete(req.params.id); // Corrected ProductModel reference
    res
      .status(200)
      .json({ success: true, message: "Product deleted successfully!" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting product",
      error: error.message,
    });
  }
};

module.exports = {
  requireSign,
  IsSeller,
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
