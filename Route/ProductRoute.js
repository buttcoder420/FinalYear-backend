const express = require("express");
const {
  createProduct,
  IsSeller,
  requireSign,
  getAllProducts,
  updateProduct,
  deleteProduct,
} = require("../Controller/ProductController");

const router = express.Router();

// Route to create a product
router.post("/create", requireSign, IsSeller, createProduct);

// Get All product (For testing)
router.get("/my-product", requireSign, IsSeller, getAllProducts);

// Route to update a product
router.put("/update/:id", requireSign, IsSeller, updateProduct);

// Route to delete a product
router.delete("/delete/:id", requireSign, IsSeller, deleteProduct);

module.exports = router;
