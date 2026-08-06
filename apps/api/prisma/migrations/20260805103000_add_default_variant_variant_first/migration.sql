ALTER TABLE "Product"
ADD COLUMN "defaultVariantId" TEXT;

UPDATE "Product" p
SET "defaultVariantId" = chosen."id"
FROM (
  SELECT DISTINCT ON (pv."productId")
    pv."productId",
    pv."id"
  FROM "ProductVariant" pv
  ORDER BY pv."productId", pv."isActive" DESC, pv."position" ASC, pv."createdAt" ASC
) AS chosen
WHERE chosen."productId" = p."id";

UPDATE "PriceTier" pt
SET "variantId" = p."defaultVariantId",
    "productId" = NULL
FROM "Product" p
WHERE pt."productId" = p."id"
  AND pt."variantId" IS NULL
  AND p."defaultVariantId" IS NOT NULL;

ALTER TABLE "Product"
ADD CONSTRAINT "Product_defaultVariantId_fkey"
FOREIGN KEY ("defaultVariantId") REFERENCES "ProductVariant"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Product_defaultVariantId_key" ON "Product"("defaultVariantId");
