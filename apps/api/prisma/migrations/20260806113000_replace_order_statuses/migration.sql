DELETE FROM "OrderPayment";
DELETE FROM "OrderItemUnit";
DELETE FROM "OrderItem";
DELETE FROM "Order";

ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";

CREATE TYPE "OrderStatus" AS ENUM (
  'nuevo',
  'pendiente_diseno',
  'pendiente_aprobacion',
  'pendiente_fabricacion',
  'pendiente_imprimir',
  'listo_entrega',
  'entregado'
);

ALTER TABLE "Order"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "OrderStatus" USING ('nuevo'::"OrderStatus"),
  ALTER COLUMN "status" SET DEFAULT 'nuevo';

DROP TYPE "OrderStatus_old";
