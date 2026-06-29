import mongoose from "mongoose";
import dotenv from "dotenv";
import Review from "./dist/models/Review.js";
import RiderReview from "./dist/models/RiderReview.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI, {
    dbName: "Zomato_Clone"
  });
  console.log("Connected to MongoDB.");

  const reviewCount = await Review.countDocuments();
  const riderReviewCount = await RiderReview.countDocuments();
  console.log(`Restaurant Reviews Count: ${reviewCount}`);
  console.log(`Rider Reviews Count: ${riderReviewCount}`);

  if (reviewCount > 0) {
    const reviews = await Review.find().limit(2);
    console.log("Sample Restaurant Reviews:", reviews);
  }

  if (riderReviewCount > 0) {
    const riderReviews = await RiderReview.find().limit(2);
    console.log("Sample Rider Reviews:", riderReviews);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
