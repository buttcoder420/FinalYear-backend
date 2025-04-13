const { HashPassword, ComparePassword } = require("../Helper/UserHelper");
const JWT = require("jsonwebtoken");
const UserModel = require("../Model/UserModel");
require("dotenv").config();
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { expressjwt: jwt } = require("express-jwt");

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

const IsAdmin = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.auth._id);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Access denied! admin only." });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

const verificationCache = new Map();

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const sendVerificationEmail = async (email, verificationCode) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your Verification Code",
    html: `<p>Your verification code is: <strong>${verificationCode}</strong></p>
             <p>Enter this code in the app to verify your email.</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Verification email sent!");
  } catch (error) {
    console.log("Error sending email:", error);
    throw new Error("Failed to send verification email.");
  }
};

const registerUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      userName,
      email,
      phoneNumber,
      whatsappNumber,
      address,
      city,
      userField,
      password,
    } = req.body;

    // Validation for common fields
    if (
      !firstName ||
      !lastName ||
      !userName ||
      !email ||
      !phoneNumber ||
      !address ||
      !city ||
      !userField ||
      !password
    ) {
      return res
        .status(400)
        .send({ success: false, message: "All fields are required" });
    }

    // Check if user already exists
    const existingUser = await UserModel.findOne({
      $or: [{ email }, { userName }, { phoneNumber }],
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Email, Username, or phone number already exist." });
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();

    // Password Hashing
    const hashedPassword = await HashPassword(password, 10);

    // Temporarily store user data
    const userData = {
      firstName,
      lastName,
      userName,
      email,
      phoneNumber,
      whatsappNumber,
      address,
      city,
      userField,
      password: hashedPassword,
      verificationCode,
    };

    verificationCache.set(email, userData);

    // Send verification email
    await sendVerificationEmail(email, verificationCode);

    res.status(201).json({
      message: "Verification code sent! Check your email.",
    });
  } catch (error) {
    console.error("Error in user registration:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};

const verifyEmail = async (req, res) => {
  const { email, code } = req.body;

  try {
    const userData = verificationCache.get(email);

    if (!userData || userData.verificationCode !== code) {
      return res
        .status(400)
        .json({ message: "Invalid verification code or email." });
    }

    // Remove verification code before saving
    delete userData.verificationCode;

    // Save user to database
    const newUser = new UserModel({ ...userData, isVerified: true });
    await newUser.save();

    // Remove from cache
    verificationCache.delete(email);

    // Generate JWT token for auto-login
    const token = JWT.sign({ _id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(200).json({
      message: "Email successfully verified! Login successful.",
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        userName: newUser.userName,
        email: newUser.email,
        whatsappNumber: newUser.whatsappNumber,
        phoneNumber: newUser.phoneNumber,
        city: newUser.city,
        role: newUser.role,
      },
      token,
    });
  } catch (error) {
    console.error("Error in email verification:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};

const loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Validation
    if (!identifier || !password) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    // Find user using email, username, or phoneNumber
    const user = await UserModel.findOne({
      $or: [
        { email: identifier },
        { userName: identifier },
        { phoneNumber: identifier },
      ],
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid credentials" });
    }

    // Check if the user is verified
    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: "Please verify your email before logging in.",
      });
    }

    // Password comparison
    const match = await ComparePassword(password, user.password);
    if (!match) {
      return res.status(401).send({
        success: false,
        message: "Invalid password",
      });
    }

    // Check user's last login time
    const loginCheck = await checkUserLastLogin(user);
    if (loginCheck.success) {
      // Update last login time
      user.lastLoginAt = new Date(); // Current time
      await user.save();

      // Create token
      const token = JWT.sign({ _id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });

      // Respond with user data including userField
      res.status(200).json({
        success: true,
        message: "Login successful",
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          userName: user.userName,
          email: user.email,
          whatsappNumber: user.whatsappNumber,
          phoneNumber: user.phoneNumber,
          city: user.city,
          role: user.role,
          userField: user.userField, // Make sure userField is returned here
        },
        token,
      });
    } else {
      // If loginCheck fails, you can handle it differently if needed
      res.status(400).json({ success: false, message: "Login error." });
    }
  } catch (error) {
    console.error("Error in user login:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

const checkUserLastLogin = async (user) => {
  // Get the current date and time
  const now = new Date();

  // Calculate the difference in days
  const daysSinceLastLogin = Math.floor(
    (now - user.lastLoginAt) / (1000 * 60 * 60 * 24)
  );

  // Admin-specific logic: Track days since last login
  if (daysSinceLastLogin > 5) {
    // Admin ko bata dein ke user kaafi din baad login kar raha hai
    console.log(`User last logged in ${daysSinceLastLogin} days ago.`);
  }

  // Allow login even if more than 100 days since last login
  // No need to show error message to the user
  return {
    success: true,
    daysSinceLastLogin: daysSinceLastLogin,
  };
};

const getAllUsers = async (req, res) => {
  try {
    const users = await UserModel.find().select("-password"); // password chhupao
    const userInfo = users.map((user) => {
      const daysSinceLastLogin = user.lastLoginAt
        ? Math.floor(
            (new Date() - new Date(user.lastLoginAt)) / (1000 * 60 * 60 * 24)
          )
        : "Never logged in";
      return { ...user._doc, daysSinceLastLogin };
    });

    res.status(200).json({
      success: true,
      TotalUser: users.length,
      message: "All users fetched successfully",
      users: userInfo,
    });
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedUser = await UserModel.findByIdAndDelete(id);

    if (!deletedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteUser:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
const updateUser = async (req, res) => {
  const { id } = req.params;
  const updateFields = req.body;

  try {
    const updatedUser = await UserModel.findByIdAndUpdate(id, updateFields, {
      new: true,
    }).select("-password");

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error in updateUser:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getLoggedInUser = async (req, res) => {
  try {
    const user = await UserModel.findById(req.auth._id).select("-password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "User profile fetched successfully",
      user,
    });
  } catch (error) {
    console.error("Error in getLoggedInUser:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateUserProfileOrPassword = async (req, res) => {
  try {
    const user = await UserModel.findById(req.auth._id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const { oldPassword, newPassword, ...profileFields } = req.body;

    // Password change logic
    if (oldPassword && newPassword) {
      const isMatch = await ComparePassword(oldPassword, user.password);
      if (!isMatch) {
        return res
          .status(400)
          .json({ success: false, message: "Old password is incorrect" });
      }

      const hashed = await HashPassword(newPassword, 10);
      user.password = hashed;
    }

    // Profile update logic
    Object.keys(profileFields).forEach((key) => {
      user[key] = profileFields[key];
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        userName: user.userName,

        phoneNumber: user.phoneNumber,
        whatsappNumber: user.whatsappNumber,
        address: user.address,
      },
    });
  } catch (error) {
    console.error("Error in updateUserProfileOrPassword:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  requireSign,
  IsAdmin,
  registerUser,
  loginUser,
  verifyEmail,
  deleteUser,
  updateUser,
  getAllUsers,
  getLoggedInUser,
  updateUserProfileOrPassword,
};
