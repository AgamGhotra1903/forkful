import mongoose, { Document, Schema } from "mongoose";

export interface ITokenBlacklist extends Document {
  token: string;
  expiresAt: Date;
}

const schema: Schema<ITokenBlacklist> = new Schema(
  {
    token: {
      type: String,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const TokenBlacklist = mongoose.model<ITokenBlacklist>("TokenBlacklist", schema);
export default TokenBlacklist;
