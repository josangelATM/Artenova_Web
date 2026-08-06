CREATE TYPE "QRCodeType" AS ENUM ('url', 'whatsapp', 'vcard');

CREATE TYPE "QRCodeStatus" AS ENUM ('active', 'inactive');

CREATE TABLE "QRCode" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" "QRCodeType" NOT NULL,
    "status" "QRCodeStatus" NOT NULL DEFAULT 'active',
    "destinationConfig" JSONB NOT NULL,
    "designConfig" JSONB NOT NULL,
    "scanCount" INTEGER NOT NULL DEFAULT 0,
    "lastScannedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QRCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QRCode_token_key" ON "QRCode"("token");

CREATE INDEX "QRCode_status_createdAt_idx" ON "QRCode"("status", "createdAt");

CREATE INDEX "QRCode_type_createdAt_idx" ON "QRCode"("type", "createdAt");
