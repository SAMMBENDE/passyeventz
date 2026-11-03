import { model, models, Schema, type Model } from "mongoose";

export interface Rental {
  sku: string;
  name: string;
  description?: string;
  subcategory?: string;
  category: string;
  unitPriceCents: number;
  replacementPriceCents?: number;
  priceUnit?: "item" | "pair" | "set" | "dozen";
  minRentalQuantity?: number;
  stockQuantity: number;
  imageUrl?: string;
  showStock?: boolean;
  isActive: boolean;
  sortOrder?: number;
  inventoryRevision?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const rentalSchema = new Schema<Rental>(
  {
    sku: {
      type: String,
      required: true,
      trim: true,
      maxlength: 64,
      match: /^[\w-]+$/,
    },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2000 },
    subcategory: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    category: {
      type: String,
      required: true,
      enum: ["MOBILIER", "VAISSELLE", "ACCESSOIRES"],
    },
    unitPriceCents: { type: Number, required: true, min: 0, max: 100_000_000, validate: Number.isInteger },
    replacementPriceCents: { type: Number, required: true, min: 0, max: 100_000_000, validate: Number.isInteger },
    priceUnit: { type: String, required: true, enum: ["item", "pair", "set", "dozen"] },
    minRentalQuantity: { type: Number, required: true, min: 1, max: 100_000, validate: Number.isInteger },
    stockQuantity: { type: Number, required: true, min: 0, max: 100_000, validate: Number.isInteger },
    imageUrl: { type: String, required: true, trim: true, maxlength: 1000 },
    showStock: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0, min: 0, max: 1_000_000, validate: Number.isInteger },
    inventoryRevision: { type: Number, default: 0, min: 0, select: false },
  },
  { timestamps: true, strict: "throw" },
);

rentalSchema.index({ sku: 1 }, { unique: true });

export const RentalModel =
  (models.Rental as Model<Rental> | undefined) ?? model<Rental>("Rental", rentalSchema);
