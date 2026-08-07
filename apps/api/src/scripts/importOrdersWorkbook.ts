import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createAdminOrderSchema } from "@artenova/shared";
import { createOrderPayments, isCodeConflict, syncOrderItems } from "../lib/adminOrderMutations";
import { buildWorkbookImportPlan, readWorkbookImportSourceData, type WorkbookImportOrderPlan, type WorkbookImportPlan, type WorkbookImportReviewGroup } from "../lib/orderWorkbookImport";
import { createOrderCode } from "../lib/orderCode";

type PreparedImportOrder = Omit<WorkbookImportOrderPlan, "createdAt"> & {
  createdAt: string;
};

type PreparedImportFile = {
  source: {
    kind: "excel-workbook";
    file?: string;
    preparedAt: string;
  };
  summary: {
    totalRows: number;
    regularRows: number;
    petRows: number;
    igRows: number;
    zeroTotalRows: number;
    automaticOrders: number;
    groupedOrders: number;
    reviewGroups: number;
  };
  reviewGroups: WorkbookImportReviewGroup[];
  automaticOrders: PreparedImportOrder[];
};

function parseArgs(argv: string[]) {
  const args = new Map<string, string | boolean>();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token) continue;
    if (token === "--execute") {
      args.set("execute", true);
      continue;
    }
    if (token.startsWith("--")) {
      const next = argv[index + 1];
      if (next && !next.startsWith("--")) {
        args.set(token.slice(2), next);
        index += 1;
      } else {
        args.set(token.slice(2), true);
      }
    }
  }
  return {
    file: typeof args.get("file") === "string" ? String(args.get("file")) : "",
    jsonFile: typeof args.get("json-file") === "string" ? String(args.get("json-file")) : "",
    out: typeof args.get("out") === "string" ? String(args.get("out")) : "",
    execute: Boolean(args.get("execute")),
  };
}

function summarizePlan(plan: WorkbookImportPlan) {
  return {
    totalRows: plan.totalRows,
    regularRows: plan.regularRows,
    petRows: plan.petRows,
    igRows: plan.igRows,
    zeroTotalRows: plan.zeroTotalRows,
    automaticOrders: plan.automaticOrders.length,
    groupedOrders: plan.groupedOrders,
    reviewGroups: plan.reviewGroups.length,
  };
}

function buildPreparedImportFile(plan: WorkbookImportPlan, file?: string): PreparedImportFile {
  return {
    source: {
      kind: "excel-workbook",
      file: file || undefined,
      preparedAt: new Date().toISOString(),
    },
    summary: summarizePlan(plan),
    reviewGroups: plan.reviewGroups,
    automaticOrders: plan.automaticOrders.map((order) => ({
      ...order,
      createdAt: order.createdAt.toISOString(),
    })),
  };
}

async function writePreparedImportFile(outFile: string, payload: PreparedImportFile) {
  await mkdir(path.dirname(outFile), { recursive: true });
  await writeFile(outFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function readPreparedImportFile(jsonFile: string) {
  const raw = await readFile(jsonFile, "utf8");
  const parsed = JSON.parse(raw) as PreparedImportFile;
  return parsed;
}

function validatePreparedOrders(prepared: PreparedImportFile): WorkbookImportOrderPlan[] {
  return prepared.automaticOrders.map((order) => ({
    ...order,
    createdAt: new Date(order.createdAt),
    input: createAdminOrderSchema.parse(order.input),
  }));
}

async function createImportedOrder(orderPlan: ReturnType<typeof buildWorkbookImportPlan>["automaticOrders"][number]) {
  const { prisma } = await import("../lib/prisma");
  let orderId: string | null = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      orderId = await prisma.$transaction(async (tx) => {
        const code = await createOrderCode(tx);
        const created = await tx.order.create({
          data: {
            code,
            source: "admin_manual" as const,
            status: orderPlan.input.status as any,
            customerName: orderPlan.input.customerName,
            customerWhatsapp: orderPlan.input.customerWhatsapp,
            customerNote: orderPlan.input.customerNote,
            internalNote: orderPlan.input.internalNote ?? null,
            estimatedTotal: 0,
            finalPrice: orderPlan.input.finalPrice ?? null,
            createdAt: orderPlan.createdAt,
          },
        });
        const estimatedTotal = await syncOrderItems(tx, created.id, orderPlan.input.items);
        await createOrderPayments(tx, created.id, orderPlan.input.payments);
        await tx.order.update({
          where: { id: created.id },
          data: {
            estimatedTotal,
            finalPrice: orderPlan.input.finalPrice ?? estimatedTotal,
            completedAt: orderPlan.input.status === "entregado" ? orderPlan.createdAt : null,
          },
        });
        return created.id;
      });
      break;
    } catch (error) {
      if (!isCodeConflict(error) || attempt === 4) {
        throw error;
      }
    }
  }
  return orderId;
}

async function main() {
  const { file, jsonFile, out, execute } = parseArgs(process.argv.slice(2));
  if (!file && !jsonFile) {
    throw new Error("Debes indicar --file <ruta-del-excel> o --json-file <ruta-del-json>");
  }

  let prepared: PreparedImportFile;
  if (jsonFile) {
    prepared = await readPreparedImportFile(jsonFile);
  } else {
    const source = readWorkbookImportSourceData(file);
    const plan = buildWorkbookImportPlan(source);
    prepared = buildPreparedImportFile(plan, file);
  }

  const validatedOrders = validatePreparedOrders(prepared);

  if (out) {
    await writePreparedImportFile(out, {
      ...prepared,
      automaticOrders: validatedOrders.map((order) => ({
        ...order,
        createdAt: order.createdAt.toISOString(),
      })),
    });
  }

  const summary = {
    file: file || jsonFile,
    mode: execute ? "execute" : "dry-run",
    ...prepared.summary,
    outputFile: out || null,
  };

  console.log(JSON.stringify({
    summary,
    reviewGroups: prepared.reviewGroups,
    automaticOrderPreview: validatedOrders.slice(0, 10).map((order) => ({
      sheetName: order.sheetName,
      rowNumbers: order.rowNumbers,
      customerName: order.customerName,
      customerWhatsapp: order.customerWhatsapp,
      mode: order.mode,
      items: order.input.items.length,
      payments: order.input.payments.length,
      finalPrice: order.input.finalPrice,
    })),
  }, null, 2));

  if (!execute) return;

  const createdOrders: Array<{ id: string | null; customerName: string; rowNumbers: number[]; sheetName: string }> = [];
  for (const order of validatedOrders) {
    const createdId = await createImportedOrder(order);
    createdOrders.push({
      id: createdId,
      customerName: order.customerName,
      rowNumbers: order.rowNumbers,
      sheetName: order.sheetName,
    });
  }

  console.log(JSON.stringify({
    created: createdOrders.length,
    skippedReviewGroups: prepared.reviewGroups.length,
    createdOrders,
  }, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
