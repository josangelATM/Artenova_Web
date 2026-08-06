-- Add support for mixed product media galleries with videos and posters.
CREATE TYPE "ProductMediaType" AS ENUM ('image', 'video');

ALTER TABLE "ProductImage"
ADD COLUMN "type" "ProductMediaType" NOT NULL DEFAULT 'image',
ADD COLUMN "posterUrl" TEXT;

ALTER TABLE "ProductVariantImage"
ADD COLUMN "type" "ProductMediaType" NOT NULL DEFAULT 'image',
ADD COLUMN "posterUrl" TEXT;
