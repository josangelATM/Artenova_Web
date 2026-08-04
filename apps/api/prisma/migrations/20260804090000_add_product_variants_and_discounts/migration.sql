CREATE TYPE "DiscountType" AS ENUM ('percentage', 'fixed');

ALTER TABLE "Product"
  ADD COLUMN "discountType" "DiscountType",
  ADD COLUMN "discountValue" DECIMAL(10,2);

ALTER TABLE "PriceTier"
  ALTER COLUMN "productId" DROP NOT NULL,
  ADD COLUMN "variantId" TEXT;

CREATE TABLE "ProductVariant" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sku" TEXT,
  "basePrice" DECIMAL(10,2) NOT NULL,
  "discountType" "DiscountType",
  "discountValue" DECIMAL(10,2),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductVariantImage" (
  "id" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "alt" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductVariantImage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductVariantAttribute" (
  "id" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductVariantAttribute_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductVariant_productId_position_idx" ON "ProductVariant"("productId", "position");

ALTER TABLE "ProductVariant"
  ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductVariantImage"
  ADD CONSTRAINT "ProductVariantImage_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductVariantAttribute"
  ADD CONSTRAINT "ProductVariantAttribute_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PriceTier"
  ADD CONSTRAINT "PriceTier_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
