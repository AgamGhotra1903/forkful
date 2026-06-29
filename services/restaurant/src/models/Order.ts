import mongoose, { Schema, Document } from "mongoose";

export interface IOrder extends Document {
  userId: string;
  restaurantId: mongoose.Types.ObjectId | string;
  restaurantName: string;
  riderId?: string | null;
  riderPhone: number | null;
  riderName: string | null;
  distance: number;
  riderAmount: number;
  riderTip?: number;
  surgeAmount?: number;

  items: {
    itemId: string;
    name: string;
    price: number;
    quantity: number;
  }[];

  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  totalAmount: number;

  restaurantPhone?: number | null;
  restaurantLocation?: {
    latitude?: number;
    longitude?: number;
    formattedAddress?: string;
  } | null;

  addressId: string;

  deliveryAddress: {
    formattedAddress: string;
    mobile: number;
    latitude: number;
    longitude: number;
  };

  status:
  | "placed"
  | "accepted"
  | "preparing"
  | "ready_for_rider"
  | "rider_assigned"
  | "picked_up"
  | "delivered"
  | "cancelled";

  // Set the moment status flips to "ready_for_rider". Used to compute the
  // rider accept window (readyForRiderAt + ACCEPT_WINDOW_MS) and to power
  // the durable "orders available to riders" list (the source of truth,
  // independent of any one-shot socket push reaching a given rider).
  readyForRiderAt?: Date | null;

  paymentMethod: "razorpay" | "stripe" | "cod";
  paymentStatus: "pending" | "paid" | "failed" | "refunded" | "refund_failed";
  transactionId?: string | null;
  paymentSessionId?: string | null;
  paymentSessionUrl?: string | null;
  statusHistory: {
    status: string;
    timestamp: Date;
  }[];

  expiresAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    userId: {
      type: String,
      required: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    restaurantName: {
      type: String,
      required: true,
    },
    riderId: {
      type: String,
      default: null,
    },
    riderName: {
      type: String,
      default: null,
    },
    riderPhone: {
      type: Number,
      default: null,
    },
    riderAmount: {
      type: Number,
      required: true,
    },
    distance: {
      type: Number,
      required: true,
    },
    riderTip: {
      type: Number,
      default: 0,
    },
    surgeAmount: {
      type: Number,
      default: 0,
    },

    items: [
      {
        itemId: String,
        name: String,
        price: Number,
        quantity: Number,
      },
    ],

    subtotal: Number,
    deliveryFee: Number,
    platformFee: Number,
    totalAmount: Number,

    restaurantPhone: { type: Number, default: null },
    restaurantLocation: {
      latitude: Number,
      longitude: Number,
      formattedAddress: String,
    },

    addressId: {
      type: String,
      required: true,
    },

    deliveryAddress: {
      formattedAddress: { type: String, required: true },
      mobile: { type: Number, required: true },
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },

    status: {
      type: String,
      enum: [
        "placed",
        "accepted",
        "preparing",
        "ready_for_rider",
        "rider_assigned",
        "picked_up",
        "delivered",
        "cancelled",
      ],
      default: "placed",
    },

    readyForRiderAt: {
      type: Date,
      default: null,
    },

    paymentMethod: {
      type: String,
      enum: ["razorpay", "stripe", "cod"],
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "refund_failed"],
      default: "pending",
    },

    transactionId: {
      type: String,
      default: null,
    },

    paymentSessionId: {
      type: String,
      default: null,
    },

    paymentSessionUrl: {
      type: String,
      default: null,
    },

    statusHistory: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],

    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

OrderSchema.index({ restaurantId: 1, status: 1 });
OrderSchema.index({ riderId: 1, status: 1 });

export default mongoose.model<IOrder>("Order", OrderSchema);
