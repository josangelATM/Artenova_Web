-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('storefront', 'admin_manual');

-- CreateEnum
CREATE TYPE "OrderPaymentMethod" AS ENUM ('efectivo', 'yappy', 'transferencia', 'otro');

-- AlterTable
ALTER TABLE "Order"
ADD COLUMN     "source" "OrderSource" NOT NULL DEFAULT 'storefront',
ADD COLUMN     "internalNote" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ALTER COLUMN   "finalPrice" DROP NOT NULL;

-- AlterTable
ALTER TABLE "OrderItem"
ADD COLUMN     "skuSnapshot" TEXT,
ADD COLUMN     "variantNameSnapshot" TEXT,
ADD COLUMN     "unitLabel" TEXT;

-- CreateTable
CREATE TABLE "OrderItemUnit" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT,
    "personalization" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItemUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderPayment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "OrderPaymentMethod" NOT NULL DEFAULT 'otro',
    "reference" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Order_source_createdAt_idx" ON "Order"("source", "createdAt");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "OrderItemUnit_orderItemId_position_idx" ON "OrderItemUnit"("orderItemId", "position");

-- CreateIndex
CREATE INDEX "OrderPayment_orderId_createdAt_idx" ON "OrderPayment"("orderId", "createdAt");

-- AddForeignKey
ALTER TABLE "OrderItemUnit" ADD CONSTRAINT "OrderItemUnit_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderPayment" ADD CONSTRAINT "OrderPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
