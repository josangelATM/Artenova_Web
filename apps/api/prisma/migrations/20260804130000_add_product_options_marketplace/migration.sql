ALTER TABLE "ProductVariant"
  ADD COLUMN "selectionKey" TEXT;

CREATE TABLE "ProductOption" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductOptionValue" (
  "id" TEXT NOT NULL,
  "optionId" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "swatch" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductOptionValue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductVariantOptionValue" (
  "variantId" TEXT NOT NULL,
  "optionValueId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductVariantOptionValue_pkey" PRIMARY KEY ("variantId", "optionValueId")
);

CREATE INDEX "ProductOption_productId_position_idx" ON "ProductOption"("productId", "position");
CREATE INDEX "ProductOptionValue_optionId_position_idx" ON "ProductOptionValue"("optionId", "position");
CREATE INDEX "ProductVariantOptionValue_optionValueId_idx" ON "ProductVariantOptionValue"("optionValueId");
CREATE INDEX "ProductVariant_productId_selectionKey_idx" ON "ProductVariant"("productId", "selectionKey");

ALTER TABLE "ProductOption"
  ADD CONSTRAINT "ProductOption_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductOptionValue"
  ADD CONSTRAINT "ProductOptionValue_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ProductOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductVariantOptionValue"
  ADD CONSTRAINT "ProductVariantOptionValue_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductVariantOptionValue"
  ADD CONSTRAINT "ProductVariantOptionValue_optionValueId_fkey" FOREIGN KEY ("optionValueId") REFERENCES "ProductOptionValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "ProductOption" ("id", "productId", "name", "position", "createdAt", "updatedAt")
SELECT DISTINCT
  'po_' || md5(pv."productId" || ':' || pva."name"),
  pv."productId",
  pva."name",
  COALESCE(MIN(pva."position") OVER (PARTITION BY pv."productId", pva."name"), 0),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "ProductVariantAttribute" pva
JOIN "ProductVariant" pv ON pv."id" = pva."variantId"
WHERE NOT EXISTS (
  SELECT 1
  FROM "ProductOption" po
  WHERE po."id" = 'po_' || md5(pv."productId" || ':' || pva."name")
);

INSERT INTO "ProductOptionValue" ("id", "optionId", "value", "position", "swatch", "createdAt", "updatedAt")
SELECT DISTINCT
  'pov_' || md5(pv."productId" || ':' || pva."name" || ':' || pva."value"),
  'po_' || md5(pv."productId" || ':' || pva."name"),
  pva."value",
  COALESCE(pva."position", 0),
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "ProductVariantAttribute" pva
JOIN "ProductVariant" pv ON pv."id" = pva."variantId"
WHERE NOT EXISTS (
  SELECT 1
  FROM "ProductOptionValue" pov
  WHERE pov."id" = 'pov_' || md5(pv."productId" || ':' || pva."name" || ':' || pva."value")
);

INSERT INTO "ProductVariantOptionValue" ("variantId", "optionValueId", "createdAt")
SELECT DISTINCT
  pva."variantId",
  'pov_' || md5(pv."productId" || ':' || pva."name" || ':' || pva."value"),
  CURRENT_TIMESTAMP
FROM "ProductVariantAttribute" pva
JOIN "ProductVariant" pv ON pv."id" = pva."variantId"
WHERE NOT EXISTS (
  SELECT 1
  FROM "ProductVariantOptionValue" pvov
  WHERE pvov."variantId" = pva."variantId"
    AND pvov."optionValueId" = 'pov_' || md5(pv."productId" || ':' || pva."name" || ':' || pva."value")
);

UPDATE "ProductVariant" pv
SET "selectionKey" = src."selectionKey"
FROM (
  SELECT
    pvov."variantId",
    string_agg(pvov."optionValueId", '|' ORDER BY pvov."optionValueId") AS "selectionKey"
  FROM "ProductVariantOptionValue" pvov
  GROUP BY pvov."variantId"
) src
WHERE src."variantId" = pv."id";
