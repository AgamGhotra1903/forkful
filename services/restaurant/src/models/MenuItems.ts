import mongoose, { Schema, Document } from "mongoose";

/**
 * ══════════════════════════════════════════════════════════════════════════
 * MONGODB ATLAS VECTOR SEARCH INDEX SPECIFICATION
 * ══════════════════════════════════════════════════════════════════════════
 * Create a Vector Search Index on your Atlas cluster for the "menuitems"
 * collection with the following definition:
 *
 * Index Name: menuitem_vector_index
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
 *       "path": "isAvailable",
 *       "type": "filter"
 *     },
 *     {
 *       "path": "embeddingStatus",
 *       "type": "filter"
 *     },
 *     {
 *       "path": "price",
 *       "type": "filter"
 *     }
 *   ]
 * }
 * ══════════════════════════════════════════════════════════════════════════
 */

export interface IMenuItem extends Document {
  restaurantId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  image?: string;
  price: number;
  isAvailable: boolean;
  embedding?: number[];
  embeddingStatus?: "pending" | "done" | "failed";
  createdAt: Date;
  updatedAt: Date;
  category?: string;
}

const schema = new Schema<IMenuItem>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
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
    timestamps: true,
  }
);

export default mongoose.model<IMenuItem>("MenuItem", schema);
