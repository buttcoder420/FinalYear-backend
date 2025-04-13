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
  updateUserProfileOrPassword,
  getLoggedInUser,
} = require("../Controller/UserController");

const router = express.Router();

// Register Route
router.post("/register", registerUser);
router.post("/login", loginUser);

// Verify Email Route
router.post("/verify-email", verifyEmail);

// Admin/User management routes
router.get("/all", requireSign, IsAdmin, getAllUsers);
router.put("/update/:id", requireSign, IsAdmin, updateUser);
router.delete("/delete/:id", requireSign, IsAdmin, deleteUser);

router.get("/me", requireSign, getLoggedInUser);
router.put("/update-profile", requireSign, updateUserProfileOrPassword);

module.exports = router;
