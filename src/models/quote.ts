import { model, models, Schema, type Model } from "mongoose";

import type { QuoteStatus } from "@/lib/quote";
import { quoteStatuses } from "@/lib/quote";
import type { QuoteLineItemInput, QuotePricingInput } from "@/lib/validation";

export interface Quote {
  reference: string;
  eventType: string;
  eventDate: Date;
  guestCount: number;
  customer: {
    email: string;
    name?: string;
    phone?: string;
  };
  note?: string;
  services: string[];
  lineItems: QuoteLineItemInput[];
  pricing?: QuotePricingInput;
  status: QuoteStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

const customerSchema = new Schema<Quote["customer"]>(
  {
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    name: { type: String, trim: true, minlength: 2, maxlength: 120 },
    phone: { type: String, trim: true, maxlength: 30 },
  },
  { _id: false, strict: "throw" },
);

const lineItemSchema = new Schema<QuoteLineItemInput>(
  {
    id: { type: String, required: true, trim: true, maxlength: 100 },
    label: { type: String, required: true, trim: true, maxlength: 160 },
    quantity: { type: Number, required: true, min: 1, max: 100_000, validate: Number.isInteger },
    unitPriceCents: { type: Number, required: true, min: 0, max: 100_000_000, validate: Number.isInteger },
    type: { type: String, enum: ["service", "rental", "addon"], default: "service" },
  },
  { _id: false, strict: "throw" },
);

const pricingSchema = new Schema<QuotePricingInput>(
  {
    subtotalCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
    deliveryCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
    cleaningCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
    taxCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
    totalCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
    depositCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
    advancePaymentCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
    balanceDueCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
    taxRateBasisPoints: { type: Number, min: 0, max: 10_000, validate: Number.isInteger },
    depositBasisPoints: { type: Number, min: 0, max: 10_000, validate: Number.isInteger },
    advanceBasisPoints: { type: Number, min: 0, max: 10_000, validate: Number.isInteger },
  },
  { _id: false, strict: "throw" },
);

const quoteSchema = new Schema<Quote>(
  {
    reference: { type: String, required: true, trim: true, unique: true, maxlength: 40 },
    eventType: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    eventDate: { type: Date, required: true },
    guestCount: { type: Number, required: true, min: 1, max: 100_000, validate: Number.isInteger },
    customer: { type: customerSchema, required: true },
    note: { type: String, trim: true, maxlength: 2000 },
    services: { type: [String], required: true, validate: (services: string[]) => services.length > 0 },
    lineItems: { type: [lineItemSchema], default: [] },
    pricing: { type: pricingSchema },
    status: { type: String, enum: quoteStatuses, default: "submitted", required: true },
  },
  { timestamps: true, strict: "throw" },
);

export const QuoteModel =
  (models.Quote as Model<Quote> | undefined) ?? model<Quote>("Quote", quoteSchema);
