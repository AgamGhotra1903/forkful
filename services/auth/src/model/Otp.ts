import mongoose, { Document, Schema, Model } from "mongoose";

export interface IOtp extends Document {
  email: string;
  otp: string;
  createdAt: Date;
}

const schema: Schema<IOtp> = new Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    otp: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 300, // 5 minutes TTL
    },
  }
);

const Otp: Model<IOtp> = (mongoose.models.Otp as Model<IOtp>) || mongoose.model<IOtp>("Otp", schema);
export default Otp;
