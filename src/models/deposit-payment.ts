import { model, models, Schema, Types, type Model } from "mongoose";

export type PaymentProvider = "stripe" | "paypal";
export type DepositPaymentStatus = "pending" | "paid" | "expired" | "failed";

export interface DepositPayment {
  bookingId: Types.ObjectId;
  provider: PaymentProvider;
  amountCents: number;
  currency: "eur";
  status: DepositPaymentStatus;
  providerOrderId?: string;
  checkoutUrl?: string;
  expiresAt: Date;
  paidAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const depositPaymentSchema = new Schema<DepositPayment>(
  {
    bookingId: { type: Schema.Types.ObjectId, required: true, ref: "Booking" },
    provider: { type: String, enum: ["stripe", "paypal"], required: true },
    amountCents: { type: Number, required: true, min: 1, validate: Number.isInteger },
    currency: { type: String, enum: ["eur"], required: true, default: "eur" },
    status: {
      type: String,
      enum: ["pending", "paid", "expired", "failed"],
      required: true,
      default: "pending",
    },
    providerOrderId: { type: String, trim: true, maxlength: 128 },
    checkoutUrl: { type: String, trim: true, maxlength: 2048 },
    expiresAt: { type: Date, required: true },
    paidAt: { type: Date },
  },
  { timestamps: true, strict: "throw" },
);

depositPaymentSchema.index(
  { bookingId: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } },
);
depositPaymentSchema.index(
  { bookingId: 1 },
  { unique: true, partialFilterExpression: { status: "paid" } },
);
depositPaymentSchema.index({ provider: 1, providerOrderId: 1 }, { unique: true, sparse: true });
depositPaymentSchema.index({ status: 1, expiresAt: 1 });

export const DepositPaymentModel =
  (models.DepositPayment as Model<DepositPayment> | undefined) ??
  model<DepositPayment>("DepositPayment", depositPaymentSchema);
