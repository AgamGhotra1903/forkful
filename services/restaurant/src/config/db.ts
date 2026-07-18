import mongoose from "mongoose";
import dns from "dns";

// ISP DNS may block *.mongodb.net SRV records — force Cloudflare + Google DNS
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGO_URL || "mongodb://localhost:27017/forkful?authSource=admin";
    await mongoose.connect(mongoUri, {
      dbName: "Zomato_Clone",
    });

    console.log("connected to mongodb");
  } catch (error) {
    console.log(error);
  }
};

export default connectDB;
