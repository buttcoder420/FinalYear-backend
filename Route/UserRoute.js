const express = require("express");
const {
  registerUser,
  loginUser,
  verifyEmail,
  getAllUsers,
  updateUser,
  deleteUser,
  requireSign,
  IsAdmin,
} = require("../Controller/UserController");

const router = express.Router();

// Register Route
router.post("/register", registerUser);
router.post("/login", loginUser);

// Verify Email Route
router.post("/verify-email", verifyEmail);

// Admin/User management routes
router.get("/all", requireSign, IsAdmin, getAllUsers); // get all users (admin)
router.put("/update/:id", requireSign, IsAdmin, updateUser); // update user by ID
router.delete("/delete/:id", requireSign, IsAdmin, deleteUser); // delete user by ID

module.exports = router;
