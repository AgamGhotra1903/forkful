import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  name: string;
  firstName?: string;
  lastName?: string;
  mobileNumber?: string;
  password?: string;
  email: string;
  image: string;
  role?: string | null;
  rewardPoints: number;
  isVerified: boolean;
  dietaryPreferences?: string[];
  allergies?: string[];
  healthGoals?: string;
}

const schema: Schema<IUser> = new Schema(
  {
    name: {
      type: String,
      required: true,
      default: "Forkful User",
    },
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    mobileNumber: {
      type: String,
    },
    password: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    image: {
      type: String,
      required: true,
      default: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150",
    },
    role: {
      type: String,
      default: null,
    },
    rewardPoints: {
      type: Number,
      default: 0,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    dietaryPreferences: {
      type: [String],
      default: [],
    },
    allergies: {
      type: [String],
      default: [],
    },
    healthGoals: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model<IUser>("User", schema);
export default User;
