import axios from "axios";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function run() {
  const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/forkful";
  await mongoose.connect(MONGO_URI, { dbName: process.env.DB_NAME || "Zomato_Clone" });

  const Order = mongoose.model("Order", new mongoose.Schema({
    userId: String,
    status: String,
    riderId: String,
    paymentStatus: String,
    paymentMethod: String
  }));

  const order = await Order.findOne({ status: "delivered", riderId: { $ne: null } });
  if (!order) {
    console.log("No delivered order with a rider found to test with!");
    await mongoose.disconnect();
    return;
  }

  console.log("Found delivered order:", order._id.toString());
  console.log("UserId:", order.userId);
  console.log("RiderId:", order.riderId);

  // Clean any existing rider review first
  const RiderReview = mongoose.model("RiderReview", new mongoose.Schema({
    orderId: mongoose.Types.ObjectId
  }));
  await RiderReview.deleteOne({ orderId: order._id });
  console.log("Cleared existing RiderReview for order:", order._id.toString());

  // Let's create a test JWT token for this userId
  const jwt = (await import("jsonwebtoken")).default;
  const token = jwt.sign(
    { user: { _id: order.userId, name: "Test User", email: "test@test.com", role: "customer" } },
    process.env.JWT_SEC || "test_jwt_secret",
    { expiresIn: "1h" }
  );

  console.log("Forming POST request to http://localhost:5002/api/rider-reviews...");
  try {
    const res = await axios.post(
      "http://localhost:5002/api/rider-reviews",
      {
        orderId: order._id.toString(),
        rating: 4,
        text: "Friendly rider!"
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    console.log("SUCCESS! Response:", res.data);
  } catch (err) {
    console.error("FAILED to post rider review:", err.response?.status, err.response?.data || err.message);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
