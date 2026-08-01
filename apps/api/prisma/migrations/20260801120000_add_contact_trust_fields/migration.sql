ALTER TABLE "Product" ADD COLUMN "sku" TEXT;

ALTER TABLE "SiteSettings" ADD COLUMN "businessHours" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "mapsUrl" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "personalizationNotice" TEXT;

CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
