import { model, models, Schema, type Model } from "mongoose";

export interface Realisation {
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const realisationSchema = new Schema<Realisation>(
  {
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    description: { type: String, required: true, trim: true, minlength: 3, maxlength: 600 },
    category: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    imageUrl: { type: String, required: true, trim: true, maxlength: 1000 },
    isActive: { type: Boolean, default: true, required: true },
    sortOrder: { type: Number, default: 0, min: 0, max: 1_000_000, validate: Number.isInteger },
  },
  { timestamps: true, strict: "throw" },
);

realisationSchema.index({ isActive: 1, sortOrder: 1, createdAt: 1 });

export const RealisationModel =
  (models.Realisation as Model<Realisation> | undefined) ??
  model<Realisation>("Realisation", realisationSchema);
