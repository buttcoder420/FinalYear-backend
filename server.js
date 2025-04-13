const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const morgan = require("morgan");
const cors = require("cors");

const app = express();

dotenv.config();

connectDB();

//middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

//api
app.use("/api/v1/users", require("./Route/UserRoute"));
app.use("/api/v1/shop", require("./Route/ShopRoute"));
app.use("/api/v1/product", require("./Route/ProductRoute"));
app.use("/api/v1/order", require("./Route/OrderRoute"));
app.use("/api/v1/rating", require("./Route/RatingRoute"));

app.get("/", (req, res) => {
  res.send("Welcome to web");
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});
