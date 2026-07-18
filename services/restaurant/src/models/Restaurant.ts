import mongoose, { Schema, Document } from "mongoose";

export interface IRestaurant extends Document {
  name: string;
  description?: string;
  image: string;
  ownerId: string;
  phone: number;
  isVerified: boolean;
  aadharNumber: string;
  aadharImage?: string;

  autoLocation: {
    type: "Point";
    coordinates: [number, number]; //[longitude, latitude]
    formattedAddress: string;
  };
  isOpen: boolean;
  createdAt: Date;
  // FIXED BUG 4: earnings tracking
  totalEarnings: number;
  // Rating aggregate
  overallRating: number;
  ratingCount: number;
}

const schema = new Schema<IRestaurant>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    image: {
      type: String,
      required: true,
    },
    ownerId: {
      type: String,
      required: true,
    },
    phone: {
      type: Number,
      required: true,
    },
    isVerified: {
      type: Boolean,
      required: true,
    },
    aadharNumber: {
      type: String,
      default: "",
    },
    aadharImage: {
      type: String,
      default: "",
    },

    autoLocation: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
      formattedAddress: {
        type: String,
      },
    },

    isOpen: {
      type: Boolean,
      default: true,
    },
    // FIXED BUG 4: total earnings across all completed orders
    totalEarnings: {
      type: Number,
      default: 0,
    },
    // Aggregate rating fields (updated on each new review)
    overallRating: {
      type: Number,
      default: 0,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

schema.index({ autoLocation: "2dsphere" });

export default mongoose.model<IRestaurant>("Restaurant", schema);
