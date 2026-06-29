import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  image: string;
  role?: string | null;
  rewardPoints: number;
}

const schema: Schema<IUser> = new Schema(
  {
    name: {
      type: String,
      required: true,
      default: "Forkful User",
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
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model<IUser>("User", schema);
export default User;
