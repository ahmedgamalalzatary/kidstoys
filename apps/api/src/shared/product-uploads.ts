import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { env } from "@kidstoys/db";
import { ApiError } from "./errors";

const mimeTypes: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, callback) => {
    if (!mimeTypes[file.mimetype]) {
      callback(ApiError.badRequest("Please check the highlighted fields", {
        images: "Only JPEG, PNG and WebP images are allowed",
      }));
      return;
    }
    callback(null, true);
  },
});

export function productImageUpload(req: Request, res: Response, next: NextFunction): void {
  upload.array("images", 8)(req, res, (error) => {
    if (error) {
      next(error instanceof ApiError ? error : ApiError.badRequest("Please check the highlighted fields", {
        images: "Upload up to 8 images, each no larger than 5 MB",
      }));
      return;
    }
    next();
  });
}

function hasExpectedSignature(file: Express.Multer.File): boolean {
  if (file.mimetype === "image/jpeg") {
    return file.buffer.length >= 3 && file.buffer[0] === 0xff && file.buffer[1] === 0xd8 && file.buffer[2] === 0xff;
  }
  if (file.mimetype === "image/png") {
    return file.buffer.length >= 8 && file.buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return file.buffer.length >= 12 && file.buffer.subarray(0, 4).toString() === "RIFF" && file.buffer.subarray(8, 12).toString() === "WEBP";
}

export async function saveProductImages(files: Express.Multer.File[]): Promise<string[]> {
  if (files.some((file) => !hasExpectedSignature(file))) {
    throw ApiError.badRequest("Please check the highlighted fields", {
      images: "The uploaded file content does not match its image type",
    });
  }
  const directory = path.join(env.uploadDir, "products");
  await mkdir(directory, { recursive: true });

  return Promise.all(
    files.map(async (file) => {
      const filename = `${randomUUID()}${mimeTypes[file.mimetype]}`;
      await writeFile(path.join(directory, filename), file.buffer, { flag: "wx" });
      return `/uploads/products/${filename}`;
    }),
  );
}
