import { describe, expect, it } from "vitest";
import {
  adminOrderQuerySchema,
  booleanish,
  cartAddSchema,
  categorySchema,
  checkoutSchema,
  loginSchema,
  productQuerySchema,
  productSchema,
  purchaseSchema,
  registerSchema,
  supplierSchema,
} from "../src/schemas";

describe("registerSchema", () => {
  it("accepts a valid registration and lowercases the email", () => {
    const result = registerSchema.parse({
      name: "Sara",
      email: "Sara@Example.COM",
      password: "supersecret",
    });
    expect(result.email).toBe("sara@example.com");
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = registerSchema.safeParse({
      name: "Sara",
      email: "sara@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = registerSchema.safeParse({
      name: "Sara",
      email: "not-an-email",
      password: "supersecret",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("requires an email and a password", () => {
    expect(loginSchema.safeParse({ email: "sara@example.com", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "sara@example.com" }).success).toBe(false);
  });
});

describe("booleanish", () => {
  it("reads the string form of false", () => {
    expect(booleanish.parse("false")).toBe(false);
  });

  it("reads the string form of true", () => {
    expect(booleanish.parse("true")).toBe(true);
  });

  it("passes real booleans through", () => {
    expect(booleanish.parse(true)).toBe(true);
  });
});

describe("categorySchema", () => {
  it("requires a name", () => {
    expect(categorySchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects a non-url image", () => {
    expect(categorySchema.safeParse({ name: "Trucks", imageUrl: "nope" }).success).toBe(false);
  });
});

describe("productSchema", () => {
  const valid = {
    name: "Wooden Train",
    description: "A lovely train",
    priceCents: 1999,
    buyPriceCents: 1000,
    categoryId: 1,
    stock: 10,
  };

  it("defaults minStock to 5 and isActive to true", () => {
    const result = productSchema.parse(valid);
    expect(result.minStock).toBe(5);
    expect(result.isActive).toBe(true);
  });

  it("requires a buy price", () => {
    const { buyPriceCents: _buyPriceCents, ...withoutBuyPrice } = valid;
    expect(productSchema.safeParse(withoutBuyPrice).success).toBe(false);
  });

  it("rejects a negative price", () => {
    expect(productSchema.safeParse({ ...valid, priceCents: -1 }).success).toBe(false);
  });

  it("rejects an unknown image url", () => {
    expect(productSchema.safeParse({ ...valid, images: ["nope"] }).success).toBe(false);
  });
});

describe("cartAddSchema", () => {
  it("defaults the quantity to 1", () => {
    expect(cartAddSchema.parse({ productId: 3 }).quantity).toBe(1);
  });

  it("rejects a quantity below 1", () => {
    expect(cartAddSchema.safeParse({ productId: 3, quantity: 0 }).success).toBe(false);
  });
});

describe("checkoutSchema", () => {
  it("requires a delivery address of at least 5 characters", () => {
    expect(
      checkoutSchema.safeParse({
        customerName: "Sara",
        customerPhone: "12345",
        city: "Kuwait",
        shippingAddress: "abc",
      }).success,
    ).toBe(false);
  });
});

describe("supplierSchema", () => {
  it("allows an empty email", () => {
    expect(supplierSchema.safeParse({ name: "Toy Mart", email: "" }).success).toBe(true);
  });

  it("rejects a malformed email", () => {
    expect(supplierSchema.safeParse({ name: "Toy Mart", email: "nope" }).success).toBe(false);
  });
});

describe("purchaseSchema", () => {
  it("requires at least one line item", () => {
    expect(purchaseSchema.safeParse({ supplierId: 1, items: [] }).success).toBe(false);
  });

  it("accepts a single line item", () => {
    const result = purchaseSchema.safeParse({
      supplierId: 1,
      items: [{ productId: 2, quantity: 10, unitCostCents: 500 }],
    });
    expect(result.success).toBe(true);
  });
});

describe("query schemas", () => {
  it("defaults product paging", () => {
    const result = productQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(24);
    expect(result.sort).toBe("newest");
  });

  it("defaults the admin order status filter to all", () => {
    expect(adminOrderQuerySchema.parse({}).status).toBe("all");
  });
});
