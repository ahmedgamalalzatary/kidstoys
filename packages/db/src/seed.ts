import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { slugify } from "@kidstoys/shared";
import { db, pool } from "./client";
import { env } from "./env";
import { categories, products, users } from "./schema";

const catalog = [
  {
    name: "Educational",
    products: ["Alphabet Blocks", "Number Puzzle", "Science Kit", "World Map", "Shape Sorter", "Reading Games"],
  },
  {
    name: "Building",
    products: ["Classic Bricks", "City Builder", "Robot Kit", "Race Track", "Magnetic Tiles", "Wooden Train"],
  },
  {
    name: "Dolls & Characters",
    products: ["Baby Doll", "Hero Figure", "Castle Playset", "Doll House", "Plush Bear", "Dragon Figure"],
  },
  {
    name: "Outdoor",
    products: ["Garden Swing", "Balance Bike", "Bubble Machine", "Sand Tools", "Football Set", "Play Tent"],
  },
];

const placeholder = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

async function seed(): Promise<void> {
  const imageDirectory = path.join(env.uploadDir, "seed");
  await mkdir(imageDirectory, { recursive: true });
  await writeFile(path.join(imageDirectory, "placeholder.png"), placeholder);

  await db
    .insert(users)
    .values({
      name: "KidsToys Owner",
      email: env.adminEmail,
      passwordHash: await bcrypt.hash(env.adminPassword, 10),
      role: "admin",
    })
    .onDuplicateKeyUpdate({
      set: { name: "KidsToys Owner", passwordHash: await bcrypt.hash(env.adminPassword, 10), role: "admin" },
    });

  for (const [categoryIndex, group] of catalog.entries()) {
    const slug = slugify(group.name);
    await db
      .insert(categories)
      .values({ name: group.name, slug, sortOrder: categoryIndex })
      .onDuplicateKeyUpdate({ set: { name: group.name, sortOrder: categoryIndex } });
    const [category] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
    if (!category) throw new Error(`Category ${group.name} was not seeded`);

    for (const [productIndex, name] of group.products.entries()) {
      const priceCents = 1200 + categoryIndex * 500 + productIndex * 250;
      await db
        .insert(products)
        .values({
          name,
          slug: slugify(name),
          description: `${name}, a delightful toy from our ${group.name.toLowerCase()} collection.`,
          shortDescription: `A delightful ${group.name.toLowerCase()} toy.`,
          priceCents,
          buyPriceCents: Math.floor(priceCents / 2),
          categoryId: category.id,
          images: ["/uploads/seed/placeholder.png"],
          stock: 10 + productIndex,
          isNew: productIndex < 2,
          isBestSeller: productIndex === 2,
        })
        .onDuplicateKeyUpdate({
          set: {
            name,
            description: `${name}, a delightful toy from our ${group.name.toLowerCase()} collection.`,
            priceCents,
            buyPriceCents: Math.floor(priceCents / 2),
            categoryId: category.id,
            images: ["/uploads/seed/placeholder.png"],
          },
        });
    }
  }

  console.log("Seeded the admin account, 4 categories and 24 products.");
}

try {
  await seed();
} finally {
  await pool.end();
}
