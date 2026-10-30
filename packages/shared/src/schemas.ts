import { z } from "zod";

/**
 * Accepts real booleans and the string forms that arrive via query params,
 * where `Boolean("false")` would wrongly be `true`.
 */
export const booleanish = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off", ""].includes(normalized)) return false;
  }
  return value;
}, z.boolean());

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  email: z.email("Enter a valid email address").max(255).transform((v) => v.toLowerCase()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(200, "Password is too long"),
});

export const loginSchema = z.object({
  email: z.email("Enter a valid email address").transform((v) => v.toLowerCase()),
  password: z.string().min(1, "Password is required"),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120).optional(),
  email: z.email("Enter a valid email address").max(255).transform((v) => v.toLowerCase()).optional(),
  phone: z.string().trim().max(40).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  address: z.string().trim().max(255).optional().nullable(),
  currentPassword: z.string().optional(),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(200)
    .optional(),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  imageUrl: z.string().trim().url("Enter a valid image URL").max(500).optional().nullable(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: booleanish.optional(),
});

export const characterSchema = categorySchema;

const ageGroupBase = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  startAge: z.coerce.number().int().min(0).max(100),
  endAge: z.coerce.number().int().min(0).max(120).optional().nullable(),
  isActive: booleanish.optional(),
});

export const ageGroupSchema = ageGroupBase.superRefine((value, context) => {
  if (value.endAge !== null && value.endAge !== undefined && value.endAge < value.startAge) {
    context.addIssue({ code: "custom", path: ["endAge"], message: "End age must be at least the start age" });
  }
});

export const ageGroupPatchSchema = ageGroupBase.partial();

const productShape = {
  name: z.string().trim().min(1, "Name is required").max(200),
  sku: z.string().trim().max(60).optional().nullable(),
  shortDescription: z.string().trim().max(255).optional().nullable(),
  description: z.string().trim().max(5000).optional(),
  priceCents: z.coerce.number().int().min(0, "Price cannot be negative").max(100_000_000),
  buyPriceCents: z.coerce.number().int().min(0, "Buy price cannot be negative").max(100_000_000),
  compareAtCents: z.coerce.number().int().min(0).max(100_000_000).optional().nullable(),
  categoryId: z.coerce.number().int().positive("Choose a category"),
  images: z.never({ error: "Upload image files instead of image URLs" }).optional(),
  videoUrl: z
    .string()
    .trim()
    .url("Enter a valid video URL")
    .max(500)
    .refine((value) => value.startsWith("https://"), "Video URL must use HTTPS")
    .optional()
    .nullable(),
  stock: z.coerce.number().int().min(0, "Stock cannot be negative").max(1_000_000),
  minStock: z.coerce.number().int().min(0).max(100_000).optional(),
  isActive: booleanish.optional(),
  characterIds: z.array(z.coerce.number().int().positive()).max(100).optional(),
  ageGroupIds: z.array(z.coerce.number().int().positive()).max(100).optional(),
  isNew: booleanish.optional(),
  isBestSeller: booleanish.optional(),
};

export const productSchema = z.object({
  ...productShape,
  description: productShape.description.default(""),
  minStock: productShape.minStock.default(5),
  isActive: productShape.isActive.default(true),
  characterIds: productShape.characterIds.default([]),
  ageGroupIds: productShape.ageGroupIds.default([]),
  isNew: productShape.isNew.default(false),
  isBestSeller: productShape.isBestSeller.default(false),
});

/** A patch carries only the fields the admin sends: the create defaults stay out of it. */
export const productPatchSchema = z.object(productShape).partial();

export const cartAddSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(1).max(999).default(1),
});

export const cartQuantitySchema = z.object({
  quantity: z.coerce.number().int().min(0).max(999),
});

export const cartMergeSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.coerce.number().int().positive(),
        quantity: z.coerce.number().int().min(1).max(999),
      }),
    )
    .max(100)
    .default([]),
});

export const checkoutSchema = z.object({
  customerName: z.string().trim().min(2, "Full name is required").max(120),
  customerPhone: z.string().trim().min(5, "Phone number is required").max(40),
  city: z.string().trim().min(1, "City is required").max(120),
  shippingAddress: z.string().trim().min(5, "Address is required").max(255),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const supplierSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  contactName: z.string().trim().max(120).optional().nullable(),
  email: z.email("Enter a valid email address").max(255).optional().nullable().or(z.literal("")),
  phone: z.string().trim().max(40).optional().nullable(),
  address: z.string().trim().max(255).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const purchaseSchema = z.object({
  supplierId: z.coerce.number().int().positive("Choose a supplier"),
  notes: z.string().trim().max(2000).optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.coerce.number().int().positive(),
        quantity: z.coerce.number().int().min(1, "Quantity must be at least 1").max(1_000_000),
        unitCostCents: z.coerce.number().int().min(0, "Cost cannot be negative").max(100_000_000),
      }),
    )
    .min(1, "Add at least one product"),
});

export const orderUpdateSchema = z.object({
  status: z
    .enum(["pending", "confirmed", "shipped", "delivered", "cancelled"])
    .optional(),
  paymentStatus: z.enum(["unpaid", "paid"]).optional(),
});

export const purchaseUpdateSchema = z.object({
  status: z.enum(["draft", "ordered", "received", "cancelled"]).optional(),
});

export const productQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(120).optional(),
  character: z.string().trim().max(500).optional(),
  ageGroup: z.string().trim().max(500).optional(),
  age: z.coerce.number().int().min(0).max(120).optional(),
  new: booleanish.optional(),
  bestSeller: booleanish.optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "name_asc"]).optional().default("newest"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(60).optional().default(24),
});

export const adminProductQuerySchema = productQuerySchema.extend({
  includeInactive: booleanish.optional().default(true),
  lowStock: booleanish.optional().default(false),
});

export const adminOrderQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z
    .enum(["pending", "confirmed", "shipped", "delivered", "cancelled", "all"])
    .optional()
    .default("all"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type ProductPatchInput = z.infer<typeof productPatchSchema>;
export type CartAddInput = z.infer<typeof cartAddSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;
export type PurchaseInput = z.infer<typeof purchaseSchema>;
