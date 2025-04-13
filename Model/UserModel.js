const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    userName: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true, unique: true },
    whatsappNumber: { type: String, required: false },
    address: { type: String, required: true },
    verificationToken: { type: String },
    verificationCode: { type: String },
    verificationTokenExpires: { type: Date },
    isVerified: { type: Boolean, default: false },
    city: {
      type: String,
      enum: [
        "Karachi",
        "Lahore",
        "Islamabad",
        "Rawalpindi",
        "Faisalabad",
        "Peshawar",
        "Quetta",
        "Multan",
        "Sialkot",
        "Gujranwala",
        "Bahawalpur",
        "Hyderabad",
        "Sargodha",
        "Sukkur",
        "Mardan",
        "Abbottabad",
        "Swat",
        "Larkana",
        "Sheikhupura",
      ],
      required: true,
    },
    userField: {
      type: String,

      enum: ["buyer", "seller"],
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    password: { type: String, required: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("users", userSchema);
