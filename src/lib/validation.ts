import { z } from "zod";

import { quoteStatuses } from "@/lib/quote";

const objectIdSchema = z.string().regex(/^[\da-f]{24}$/i, "Identifiant invalide.");
const emailSchema = z.string().trim().email().max(254).transform((email) => email.toLowerCase());
export const adminLoginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(16).max(1024),
  })
  .strict();
const phoneSchema = z
  .string()
  .trim()
  .min(7)
  .max(30)
  .regex(/^[+()\d.\s-]+$/, "Numéro de téléphone invalide.");

export const rentalCreateSchema = z
  .object({
    sku: z.string().trim().min(1).max(64).regex(/^[\w-]+$/),
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(2000).optional(),
    category: z.string().trim().min(2).max(80),
    unitPriceCents: z.number().int().min(0).max(100_000_000),
    stockQuantity: z.number().int().min(0).max(100_000),
    isActive: z.boolean().default(true),
  })
  .strict();

export const rentalUpdateSchema = rentalCreateSchema
  .extend({ isActive: z.boolean().optional() })
  .partial()
  .refine((rental) => Object.keys(rental).length > 0, {
    message: "Au moins un champ doit être modifié.",
  });

export const quoteRequestSchema = z
  .object({
    eventType: z.string().trim().min(2).max(100),
    eventDate: z.iso.date(),
    guestCount: z.number().int().min(1).max(100_000),
    email: emailSchema,
    customerName: z.string().trim().min(2).max(120).optional(),
    phone: phoneSchema.optional(),
    note: z.string().trim().max(2000).optional(),
    services: z
      .array(z.string().trim().min(2).max(100))
      .min(1)
      .max(20)
      .superRefine((services, context) => {
        if (new Set(services).size !== services.length) {
          context.addIssue({
            code: "custom",
            message: "Les prestations ne doivent pas être répétées.",
          });
        }
      }),
  })
  .strict();

export const quoteStatusSchema = z.enum(quoteStatuses);
export const quoteReviewSchema = z
  .object({ status: z.enum(["approved", "rejected"]) })
  .strict();

export const quoteLineItemSchema = z
  .object({
    id: z.string().trim().min(1).max(100),
    label: z.string().trim().min(1).max(160),
    quantity: z.number().int().min(1).max(100_000),
    unitPriceCents: z.number().int().min(0).max(100_000_000),
    type: z.enum(["service", "rental", "addon"]).default("service"),
  })
  .strict();

export const quoteEditorSchema = z
  .object({
    updatedAt: z.iso.datetime({ offset: true }),
    eventType: z.string().trim().min(2).max(100),
    eventDate: z.iso.date(),
    guestCount: z.number().int().min(1).max(100_000),
    services: z
      .array(z.string().trim().min(2).max(100))
      .min(1)
      .max(20)
      .superRefine((services, context) => {
        if (new Set(services).size !== services.length) {
          context.addIssue({ code: "custom", message: "Prestations en double." });
        }
      }),
    note: z.string().trim().max(2000).optional(),
    lineItems: z.array(quoteLineItemSchema).min(1).max(100),
    deliveryCents: z.number().int().min(0).max(100_000_000),
    cleaningCents: z.number().int().min(0).max(100_000_000),
    taxRateBasisPoints: z.number().int().min(0).max(10_000),
    depositBasisPoints: z.number().int().min(0).max(10_000),
    advanceBasisPoints: z.number().int().min(0).max(10_000),
  })
  .strict()
  .superRefine(({ lineItems }, context) => {
    if (new Set(lineItems.map(({ id }) => id.toLowerCase())).size !== lineItems.length) {
      context.addIssue({
        code: "custom",
        message: "Les références des lignes doivent être uniques.",
      });
    }

    const rentalIds = lineItems
      .filter(({ type }) => type === "rental")
      .map(({ id }) => id.toLowerCase());
    if (new Set(rentalIds).size !== rentalIds.length) {
      context.addIssue({
        code: "custom",
        message: "Un SKU de location ne peut apparaître qu’une fois.",
      });
    }
  });

export const quotePricingSchema = z
  .object({
    subtotalCents: z.number().int().min(0),
    deliveryCents: z.number().int().min(0),
    cleaningCents: z.number().int().min(0),
    taxCents: z.number().int().min(0),
    totalCents: z.number().int().min(0),
    depositCents: z.number().int().min(0),
    advancePaymentCents: z.number().int().min(0),
    balanceDueCents: z.number().int().min(0),
    taxRateBasisPoints: z.number().int().min(0).max(10_000).optional(),
    depositBasisPoints: z.number().int().min(0).max(10_000).optional(),
    advanceBasisPoints: z.number().int().min(0).max(10_000).optional(),
  })
  .strict();

export const quoteEditorResponseSchema = z
  .object({
    reference: z.string(),
    status: quoteStatusSchema,
    updatedAt: z.iso.datetime({ offset: true }),
    eventType: z.string(),
    eventDate: z.iso.datetime({ offset: true }),
    guestCount: z.number().int(),
    services: z.array(z.string()),
    note: z.string().optional(),
    lineItems: z.array(quoteLineItemSchema),
    pricing: quotePricingSchema,
  })
  .strict();

export const bookingCreateSchema = z
  .object({
    quoteId: objectIdSchema,
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }),
    rentalItems: z
      .array(
        z
          .object({
            rentalId: objectIdSchema,
            quantity: z.number().int().min(1).max(100_000),
          })
          .strict(),
      )
      .max(100),
    deliveryAddress: z.string().trim().min(5).max(500).optional(),
    note: z.string().trim().max(2000).optional(),
  })
  .strict()
  .superRefine(({ rentalItems }, context) => {
    if (new Set(rentalItems.map(({ rentalId }) => rentalId.toLowerCase())).size !== rentalItems.length) {
      context.addIssue({
        code: "custom",
        message: "Chaque location ne doit apparaître qu’une seule fois.",
        path: ["rentalItems"],
      });
    }
  })
  .refine(
    ({ startsAt, endsAt }) => new Date(endsAt).getTime() > new Date(startsAt).getTime(),
    {
      message: "La fin de la réservation doit être postérieure à son début.",
      path: ["endsAt"],
    },
  );

export const adminBookingCreateSchema = z
  .object({
    quoteId: objectIdSchema,
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }),
    deliveryAddress: z.string().trim().min(5).max(500).optional(),
    note: z.string().trim().max(2000).optional(),
  })
  .strict()
  .refine(
    ({ startsAt, endsAt }) => new Date(endsAt).getTime() > new Date(startsAt).getTime(),
    {
      message: "La fin de la réservation doit être postérieure à son début.",
      path: ["endsAt"],
    },
  );

export const bookingStatusSchema = z.enum([
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "expired",
]);

export const bookingStatusUpdateSchema = z
  .object({
    status: bookingStatusSchema,
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export const paymentProviderSchema = z.enum(["stripe", "paypal"]);

export const bookingRentalItemSchema = z
  .object({
    rentalId: objectIdSchema,
    sku: z.string().trim().min(1).max(64),
    name: z.string().trim().min(1).max(120),
    quantity: z.number().int().min(1).max(100_000),
    unitPriceCents: z.number().int().min(0).max(100_000_000),
  })
  .strict();

export type RentalCreateInput = z.infer<typeof rentalCreateSchema>;
export type RentalUpdateInput = z.infer<typeof rentalUpdateSchema>;
export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;
export type QuoteLineItemInput = z.infer<typeof quoteLineItemSchema>;
export type QuotePricingInput = z.infer<typeof quotePricingSchema>;
export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;
export type BookingStatus = z.infer<typeof bookingStatusSchema>;
export type BookingRentalItemInput = z.infer<typeof bookingRentalItemSchema>;
