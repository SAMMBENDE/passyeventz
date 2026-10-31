import { model, models, Schema, type Model } from "mongoose";

export interface Rental {
  sku: string;
  name: string;
  description?: string;
  category: string;
  unitPriceCents: number;
  stockQuantity: number;
  isActive: boolean;
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
    category: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    unitPriceCents: { type: Number, required: true, min: 0, max: 100_000_000, validate: Number.isInteger },
    stockQuantity: { type: Number, required: true, min: 0, max: 100_000, validate: Number.isInteger },
    isActive: { type: Boolean, default: true },
    inventoryRevision: { type: Number, default: 0, min: 0, select: false },
  },
  { timestamps: true, strict: "throw" },
);

rentalSchema.index({ sku: 1 }, { unique: true });

export const RentalModel =
  (models.Rental as Model<Rental> | undefined) ?? model<Rental>("Rental", rentalSchema);
