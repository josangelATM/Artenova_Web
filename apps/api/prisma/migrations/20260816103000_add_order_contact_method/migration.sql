CREATE TYPE "OrderContactMethod" AS ENUM ('whatsapp', 'instagram', 'facebook', 'tiktok', 'otro');

ALTER TABLE "Order"
ADD COLUMN "contactMethod" "OrderContactMethod" NOT NULL DEFAULT 'whatsapp';
