ALTER TABLE "Category"
ADD COLUMN "currencySymbol" TEXT NOT NULL DEFAULT 'B/.';

UPDATE "Category"
SET "currencySymbol" = 'B/.';
