import mongoose, { Schema, Document } from "mongoose";

/**
 * Customer → Rider rating, submitted after a delivery is marked "delivered".
 * Mirrors the restaurant Review model, but:
 *   - riderId is a plain string (Rider documents live in the separate rider
 *     service's database, so we can't use a Mongoose ref/populate here —
 *     same convention already used for Order.riderId).
 *   - the comment is optional, since the rating itself is the required part
 *     of this flow and feedback text is a nice-to-have.
 */
export interface IRiderReview extends Document {
  orderId: mongoose.Types.ObjectId;
  riderId: string;
  userId: mongoose.Types.ObjectId;
  rating: number;
  text?: string;
  createdAt: Date;
}

const RiderReviewSchema = new Schema<IRiderReview>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true, // one rider rating per order
    },
    riderId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    text: {
      type: String,
      maxlength: 1000,
      default: "",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export default mongoose.model<IRiderReview>("RiderReview", RiderReviewSchema);
