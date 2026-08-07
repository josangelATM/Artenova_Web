ALTER TABLE "OrderItem"
ADD COLUMN "appliedAdjustments" JSONB NOT NULL DEFAULT '[]';
