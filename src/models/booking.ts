import { model, models, Schema, Types, type Model } from "mongoose";

import type { BookingStatus } from "@/lib/validation";

interface BookingRentalItem {
  rentalId: Types.ObjectId;
  sku: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
}

export interface Booking {
  reference: string;
  quoteId: Types.ObjectId;
  startsAt: Date;
  endsAt: Date;
  customer: {
    email: string;
    name?: string;
    phone?: string;
  };
  eventType: string;
  rentalItems: BookingRentalItem[];
  deliveryAddress?: string;
  note?: string;
  status: BookingStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

const customerSchema = new Schema<Booking["customer"]>(
  {
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    name: { type: String, trim: true, minlength: 2, maxlength: 120 },
    phone: { type: String, trim: true, maxlength: 30 },
  },
  { _id: false, strict: "throw" },
);

const rentalItemSchema = new Schema<BookingRentalItem>(
  {
    rentalId: { type: Schema.Types.ObjectId, required: true, ref: "Rental" },
    sku: { type: String, required: true, trim: true, maxlength: 64 },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    quantity: { type: Number, required: true, min: 1, max: 100_000, validate: Number.isInteger },
    unitPriceCents: { type: Number, required: true, min: 0, max: 100_000_000, validate: Number.isInteger },
  },
  { _id: false, strict: "throw" },
);

const bookingSchema = new Schema<Booking>(
  {
    reference: { type: String, required: true, trim: true, unique: true, maxlength: 40 },
    quoteId: { type: Schema.Types.ObjectId, required: true, ref: "Quote" },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    customer: { type: customerSchema, required: true },
    eventType: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    rentalItems: {
      type: [rentalItemSchema],
      required: true,
    },
    deliveryAddress: { type: String, trim: true, minlength: 5, maxlength: 500 },
    note: { type: String, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: ["pending", "confirmed", "in_progress", "completed", "cancelled", "expired"],
      default: "pending",
      required: true,
    },
  },
  { timestamps: true, strict: "throw" },
);

bookingSchema.pre("validate", function () {
  if (this.startsAt && this.endsAt && this.endsAt.getTime() <= this.startsAt.getTime()) {
    this.invalidate("endsAt", "Booking end must be after its start.");
  }
});

bookingSchema.index({ quoteId: 1 }, { unique: true });
bookingSchema.index({ status: 1, startsAt: 1, "rentalItems.rentalId": 1 });
bookingSchema.index({ status: 1, createdAt: 1 });

export const BookingModel =
  (models.Booking as Model<Booking> | undefined) ?? model<Booking>("Booking", bookingSchema);
