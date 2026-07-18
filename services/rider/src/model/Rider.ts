import mongoose, { Schema, Document } from "mongoose";

export interface IRider extends Document {
  userId: string;
  name: string;
  picture: string;
  phoneNumber: string;
  aadharNumber: string;
  aadharImage?: string;
  drivingLicenseNumber: string;
  isVerified: boolean;
  location: {
    type: "Point";
    coordinates: [number, number];
  };
  isAvailable: boolean;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
  // earnings tracking
  totalEarnings: number;
  todayEarnings: number;
  lastEarningsResetDate: Date;
  // delivery stats
  totalDeliveries: number;
  rating: number;
  ratingCount: number;
}

const schema = new Schema<IRider>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    picture: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    aadharNumber: {
      type: String,
      required: true,
    },
    aadharImage: {
      type: String,
      default: "",
    },
    drivingLicenseNumber: {
      type: String,
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    isAvailable: {
      type: Boolean,
      default: false,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    // earnings tracking
    totalEarnings: {
      type: Number,
      default: 0,
    },
    todayEarnings: {
      type: Number,
      default: 0,
    },
    lastEarningsResetDate: {
      type: Date,
      default: Date.now,
    },
    // delivery stats
    totalDeliveries: {
      type: Number,
      default: 0,
    },
    rating: {
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

schema.index({ location: "2dsphere" });

export const Rider = mongoose.model<IRider>("Rider", schema);
