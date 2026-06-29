import mongoose, { Schema, Document } from "mongoose";

/**
 * ══════════════════════════════════════════════════════════════════════════
 * MONGODB ATLAS VECTOR SEARCH INDEX SPECIFICATION
 * ══════════════════════════════════════════════════════════════════════════
 * Create a Vector Search Index on your Atlas cluster for the "reviews"
 * collection with the following definition:
 *
 * Index Name: review_vector_index
 * Definition (JSON):
 * {
 *   "fields": [
 *     {
 *       "numDimensions": 384,
 *       "path": "embedding",
 *       "similarity": "cosine",
 *       "type": "vector"
 *     },
 *     {
 *       "path": "restaurantId",
 *       "type": "filter"
 *     },
 *     {
 *       "path": "embeddingStatus",
 *       "type": "filter"
 *     }
 *   ]
 * }
 * ══════════════════════════════════════════════════════════════════════════
 */

export interface IReview extends Document {
  orderId: mongoose.Types.ObjectId;
  restaurantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  rating: number;
  text: string;
  embedding?: number[];
  embeddingStatus: "pending" | "done" | "failed";
  createdAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
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
      required: true,
      maxlength: 1000,
    },
    embedding: {
      type: [Number],
      default: undefined,
    },
    embeddingStatus: {
      type: String,
      enum: ["pending", "done", "failed"],
      default: "pending",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export default mongoose.model<IReview>("Review", ReviewSchema);
