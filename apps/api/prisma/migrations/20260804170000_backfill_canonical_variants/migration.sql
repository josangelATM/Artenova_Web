INSERT INTO "ProductVariant" (
  "id",
  "productId",
  "name",
  "sku",
  "selectionKey",
  "basePrice",
  "discountType",
  "discountValue",
  "isActive",
  "position",
  "createdAt",
  "updatedAt"
)
SELECT
  'pv_' || md5(p."id" || ':canonical'),
  p."id",
  p."name",
  p."sku",
  NULL,
  p."basePrice",
  p."discountType",
  p."discountValue",
  TRUE,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Product" p
WHERE NOT EXISTS (
  SELECT 1
  FROM "ProductVariant" pv
  WHERE pv."productId" = p."id"
);

INSERT INTO "PriceTier" (
  "id",
  "productId",
  "variantId",
  "minQuantity",
  "unitPrice",
  "totalPrice",
  "label",
  "createdAt"
)
SELECT
  'pt_' || md5(pt."id" || ':canonical'),
  NULL,
  'pv_' || md5(pt."productId" || ':canonical'),
  pt."minQuantity",
  pt."unitPrice",
  pt."totalPrice",
  pt."label",
  CURRENT_TIMESTAMP
FROM "PriceTier" pt
WHERE pt."productId" IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM "ProductVariant" pv
    WHERE pv."id" = 'pv_' || md5(pt."productId" || ':canonical')
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "PriceTier" existing
    WHERE existing."variantId" = 'pv_' || md5(pt."productId" || ':canonical')
      AND existing."minQuantity" = pt."minQuantity"
      AND existing."unitPrice" = pt."unitPrice"
      AND COALESCE(existing."totalPrice", -1) = COALESCE(pt."totalPrice", -1)
      AND COALESCE(existing."label", '') = COALESCE(pt."label", '')
  );
