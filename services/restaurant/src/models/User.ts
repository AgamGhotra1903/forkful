import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  image: string;
  role: string;
}

const schema: Schema<IUser> = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    image: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Mongoose models are shared globally per connection.
// If the model is already compiled, use that model; otherwise compile it.
const User = mongoose.models.User || mongoose.model<IUser>("User", schema);
export default User;
