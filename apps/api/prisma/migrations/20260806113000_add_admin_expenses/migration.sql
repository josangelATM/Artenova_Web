-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('materia_prima', 'servicios', 'publicidad', 'salario', 'viaticos', 'otros');

-- CreateEnum
CREATE TYPE "ExpensePaymentMethod" AS ENUM ('efectivo', 'yappy', 'transferencia', 'otro');

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "paymentMethod" "ExpensePaymentMethod",
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Expense_expenseDate_createdAt_idx" ON "Expense"("expenseDate", "createdAt");

-- CreateIndex
CREATE INDEX "Expense_category_expenseDate_idx" ON "Expense"("category", "expenseDate");
