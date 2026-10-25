ALTER TABLE "Product" ADD COLUMN "minimumSaleQuantity" INTEGER;
ALTER TABLE "Product" ADD CONSTRAINT "Product_minimumSaleQuantity_positive" CHECK ("minimumSaleQuantity" > 0);
