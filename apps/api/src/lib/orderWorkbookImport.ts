import XLSX from "xlsx";
import type { CreateAdminOrderInput } from "@artenova/shared";

type SheetName = "Pedidos regulares" | "Cédulas de mascota";

type BaseImportRow = {
  sheetName: SheetName;
  rowNumber: number;
  originalDate: Date;
  dateKey: string;
  customerName: string;
  customerNameKey: string;
  customerWhatsapp: string;
  customerWhatsappKey: string;
};

export type RegularImportRow = BaseImportRow & {
  sheetName: "Pedidos regulares";
  detail: string;
  quantity: number;
  unitCost: number;
  total: number;
  paid: number;
  balance: number;
};

export type PetTagImportRow = BaseImportRow & {
  sheetName: "Cédulas de mascota";
  petName: string;
  plateSize: string;
  plateColor: string;
  qr: string;
  quantity: number;
  unitCost: number;
  total: number;
  paid: number;
  balance: number;
};

export type WorkbookImportSourceData = {
  regularRows: RegularImportRow[];
  petRows: PetTagImportRow[];
};

export type WorkbookImportReviewGroup = {
  sheetName: SheetName;
  rowNumbers: number[];
  customerName: string;
  customerWhatsapp: string;
  reason: string;
};

export type WorkbookImportOrderPlan = {
  sheetName: SheetName;
  rowNumbers: number[];
  customerName: string;
  customerWhatsapp: string;
  createdAt: Date;
  mode: "single" | "grouped";
  input: CreateAdminOrderInput;
};

export type WorkbookImportPlan = {
  totalRows: number;
  regularRows: number;
  petRows: number;
  igRows: number;
  zeroTotalRows: number;
  automaticOrders: WorkbookImportOrderPlan[];
  groupedOrders: number;
  reviewGroups: WorkbookImportReviewGroup[];
};

type Group<T extends BaseImportRow> = {
  key: string;
  rows: T[];
};

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function toTrimmedString(value: unknown) {
  return value == null ? "" : String(value).trim();
}

function normalizeTextKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizePhoneVisible(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizePhoneKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function isInstagramLikePhone(phoneKey: string) {
  return /^(ig|instagram)$/.test(phoneKey);
}

function resolveImportedContactMethod(phoneKey: string): CreateAdminOrderInput["contactMethod"] {
  return isInstagramLikePhone(phoneKey) ? "instagram" : "whatsapp";
}

function formatDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDate(value: unknown, context: string) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const parsed = new Date(String(value ?? ""));
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Fecha inválida en ${context}`);
  }
  return parsed;
}

function toPositiveInt(value: unknown) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 1;
  return Math.max(1, Math.round(numeric));
}

function toMoney(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? roundMoney(numeric) : 0;
}

function isImportableRow(row: Array<string | number | Date | null>) {
  const firstCell = row[0];
  const customerName = toTrimmedString(row[1]);
  const customerWhatsapp = toTrimmedString(row[2]);
  if (!customerName || !customerWhatsapp) return false;
  if (firstCell instanceof Date) return !Number.isNaN(firstCell.getTime());
  const parsed = new Date(String(firstCell ?? ""));
  return !Number.isNaN(parsed.getTime());
}

function loadSheetRows(filePath: string, sheetName: SheetName) {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`La hoja ${sheetName} no existe en ${filePath}`);
  }
  return XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
  });
}

export function readWorkbookImportSourceData(filePath: string): WorkbookImportSourceData {
  const regularMatrix = loadSheetRows(filePath, "Pedidos regulares");
  const petMatrix = loadSheetRows(filePath, "Cédulas de mascota");

  const regularRows: RegularImportRow[] = regularMatrix.slice(3).flatMap((row, index) => {
    if (!row.some((cell) => cell != null && String(cell).trim() !== "")) return [];
    if (!isImportableRow(row)) return [];
    const originalDate = toDate(row[0], `Pedidos regulares fila ${index + 4}`);
    const customerName = toTrimmedString(row[1]);
    const customerWhatsapp = normalizePhoneVisible(toTrimmedString(row[2]));
    const detail = toTrimmedString(row[3]);
    return [{
      sheetName: "Pedidos regulares" as const,
      rowNumber: index + 4,
      originalDate,
      dateKey: formatDateKey(originalDate),
      customerName,
      customerNameKey: normalizeTextKey(customerName),
      customerWhatsapp,
      customerWhatsappKey: normalizePhoneKey(customerWhatsapp),
      detail,
      quantity: toPositiveInt(row[4]),
      unitCost: toMoney(row[5]),
      total: toMoney(row[6]),
      paid: toMoney(row[7]),
      balance: toMoney(row[8]),
    }];
  });

  const petRows: PetTagImportRow[] = petMatrix.slice(3).flatMap((row, index) => {
    if (!row.some((cell) => cell != null && String(cell).trim() !== "")) return [];
    if (!isImportableRow(row)) return [];
    const originalDate = toDate(row[0], `Cédulas de mascota fila ${index + 4}`);
    const customerName = toTrimmedString(row[1]);
    const customerWhatsapp = normalizePhoneVisible(toTrimmedString(row[2]));
    return [{
      sheetName: "Cédulas de mascota" as const,
      rowNumber: index + 4,
      originalDate,
      dateKey: formatDateKey(originalDate),
      customerName,
      customerNameKey: normalizeTextKey(customerName),
      customerWhatsapp,
      customerWhatsappKey: normalizePhoneKey(customerWhatsapp),
      petName: toTrimmedString(row[3]),
      plateSize: toTrimmedString(row[4]),
      plateColor: toTrimmedString(row[5]),
      qr: toTrimmedString(row[6]),
      quantity: toPositiveInt(row[7]),
      unitCost: toMoney(row[8]),
      total: toMoney(row[9]),
      paid: toMoney(row[10]),
      balance: toMoney(row[11]),
    }];
  });

  return { regularRows, petRows };
}

function buildGroupKey(row: BaseImportRow) {
  return [row.dateKey, row.customerNameKey, row.customerWhatsappKey].join("|");
}

function groupRows<T extends BaseImportRow>(rows: T[]) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = buildGroupKey(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return Array.from(groups.entries()).map(([key, groupedRows]) => ({ key, rows: groupedRows })) satisfies Group<T>[];
}

function hasZeroComplement(rows: Array<{ total: number }>) {
  return rows.some((row) => row.total === 0) && rows.some((row) => row.total > 0);
}

function hasRepeatedSharedPartialPayment(rows: Array<{ total: number; paid: number; balance: number }>) {
  if (rows.length <= 1 || hasZeroComplement(rows)) return false;
  const positiveRows = rows.filter((row) => row.total > 0);
  if (positiveRows.length !== rows.length) return false;
  const distinctPaid = new Set(positiveRows.map((row) => row.paid).filter((paid) => paid > 0));
  const distinctBalance = new Set(positiveRows.map((row) => row.balance).filter((balance) => balance > 0));
  if (distinctPaid.size !== 1 || distinctBalance.size !== 1) return false;
  return positiveRows.every((row) => row.paid > 0 && row.paid < row.total && row.balance > 0);
}

function resolveGroupPayment(rows: Array<{ paid: number }>) {
  const payments = Array.from(new Set(rows.map((row) => row.paid).filter((paid) => paid > 0)));
  if (payments.length === 0) return { amount: null, inconsistent: false };
  if (payments.length === 1) return { amount: payments[0] ?? null, inconsistent: false };
  return { amount: null, inconsistent: true };
}

function buildRegularOrderPlan(rows: RegularImportRow[], mode: "single" | "grouped"): WorkbookImportOrderPlan {
  const firstRow = rows[0]!;
  const payment = resolveGroupPayment(rows);
  if (payment.inconsistent) {
    throw new Error("Pagos inconsistentes en grupo de pedidos regulares");
  }
  const total = roundMoney(rows.reduce((sum, row) => sum + row.total, 0));

  return {
    sheetName: "Pedidos regulares",
    rowNumbers: rows.map((row) => row.rowNumber),
    customerName: firstRow.customerName,
    customerWhatsapp: firstRow.customerWhatsapp,
    createdAt: firstRow.originalDate,
    mode,
    input: {
      customerName: firstRow.customerName,
      customerWhatsapp: firstRow.customerWhatsapp,
      contactMethod: resolveImportedContactMethod(firstRow.customerWhatsappKey),
      customerNote: "",
      internalNote: `Importado desde Excel | Hoja: Pedidos regulares | Filas: ${rows.map((row) => row.rowNumber).join(", ")}`,
      status: "nuevo",
      finalPrice: total,
      items: rows.map((row) => ({
        productId: null,
        productName: row.detail || "Pedido importado",
        quantity: row.quantity,
        unitPrice: row.unitCost,
        extrasTotal: 0,
        skuSnapshot: null,
        variantNameSnapshot: null,
        unitLabel: null,
        selectedExtraIds: [],
        appliedAdjustments: [],
        personalization: {
          fecha_original: row.dateKey,
          hoja_origen: row.sheetName,
          fila_origen: String(row.rowNumber),
        },
        isDone: false,
        units: [],
      })),
      payments: payment.amount ? [{
        amount: payment.amount,
        method: "yappy",
        note: "Importado desde Excel",
      }] : [],
    },
  };
}

function buildPetUnit(row: PetTagImportRow, position: number) {
  return {
    position,
    label: row.petName || `Mascota ${position + 1}`,
    personalization: {
      nombre_mascota: row.petName,
      tamano: row.plateSize,
      color: row.plateColor,
      qr: row.qr,
      cantidad_original: String(row.quantity),
      costo_unitario_original: String(row.unitCost),
      total_original: String(row.total),
      fila_origen: String(row.rowNumber),
    },
  };
}

function buildSinglePetOrderPlan(row: PetTagImportRow): WorkbookImportOrderPlan {
  const quantity = row.quantity;
  const unitPrice = row.total > 0 ? roundMoney(row.total / quantity) : row.unitCost;
  return {
    sheetName: "Cédulas de mascota",
    rowNumbers: [row.rowNumber],
    customerName: row.customerName,
    customerWhatsapp: row.customerWhatsapp,
    createdAt: row.originalDate,
    mode: "single",
    input: {
      customerName: row.customerName,
      customerWhatsapp: row.customerWhatsapp,
      contactMethod: resolveImportedContactMethod(row.customerWhatsappKey),
      customerNote: "",
      internalNote: `Importado desde Excel | Hoja: Cédulas de mascota | Fila: ${row.rowNumber}`,
      status: "nuevo",
      finalPrice: row.total,
      items: [{
        productId: null,
        productName: "Cédula de mascota",
        quantity,
        unitPrice,
        extrasTotal: 0,
        skuSnapshot: null,
        variantNameSnapshot: null,
        unitLabel: null,
        selectedExtraIds: [],
        appliedAdjustments: [],
        personalization: {
          fecha_original: row.dateKey,
          hoja_origen: row.sheetName,
        },
        isDone: false,
        units: [buildPetUnit(row, 0)],
      }],
      payments: row.paid > 0 ? [{
        amount: row.paid,
        method: "yappy",
        note: "Importado desde Excel",
      }] : [],
    },
  };
}

function buildGroupedPetOrderPlan(rows: PetTagImportRow[]): WorkbookImportOrderPlan {
  const firstRow = rows[0]!;
  const payment = resolveGroupPayment(rows);
  if (payment.inconsistent) {
    throw new Error("Pagos inconsistentes en grupo de cédulas");
  }
  const total = roundMoney(rows.reduce((sum, row) => sum + row.total, 0));

  return {
    sheetName: "Cédulas de mascota",
    rowNumbers: rows.map((row) => row.rowNumber),
    customerName: firstRow.customerName,
    customerWhatsapp: firstRow.customerWhatsapp,
    createdAt: firstRow.originalDate,
    mode: "grouped",
    input: {
      customerName: firstRow.customerName,
      customerWhatsapp: firstRow.customerWhatsapp,
      contactMethod: resolveImportedContactMethod(firstRow.customerWhatsappKey),
      customerNote: "",
      internalNote: `Importado desde Excel | Hoja: Cédulas de mascota | Filas: ${rows.map((row) => row.rowNumber).join(", ")}`,
      status: "nuevo",
      finalPrice: total,
      items: [{
        productId: null,
        productName: "Cédula de mascota",
        quantity: 1,
        unitPrice: total,
        extrasTotal: 0,
        skuSnapshot: null,
        variantNameSnapshot: null,
        unitLabel: null,
        selectedExtraIds: [],
        appliedAdjustments: [],
        personalization: {
          fecha_original: firstRow.dateKey,
          hoja_origen: firstRow.sheetName,
          registros_agrupados: String(rows.length),
        },
        isDone: false,
        units: rows.map((row, index) => buildPetUnit(row, index)),
      }],
      payments: payment.amount ? [{
        amount: payment.amount,
        method: "yappy",
        note: "Importado desde Excel",
      }] : [],
    },
  };
}

function buildReviewGroup<T extends BaseImportRow>(rows: T[], reason: string): WorkbookImportReviewGroup {
  const firstRow = rows[0]!;
  return {
    sheetName: firstRow.sheetName,
    rowNumbers: rows.map((row) => row.rowNumber),
    customerName: firstRow.customerName,
    customerWhatsapp: firstRow.customerWhatsapp,
    reason,
  };
}

export function buildWorkbookImportPlan(source: WorkbookImportSourceData): WorkbookImportPlan {
  const automaticOrders: WorkbookImportOrderPlan[] = [];
  const reviewGroups: WorkbookImportReviewGroup[] = [];

  for (const group of groupRows(source.regularRows)) {
    if (group.rows.length > 1 && hasZeroComplement(group.rows)) {
      const payment = resolveGroupPayment(group.rows);
      if (payment.inconsistent) {
        reviewGroups.push(buildReviewGroup(group.rows, "Pagos inconsistentes en grupo de pedidos regulares"));
        continue;
      }
      automaticOrders.push(buildRegularOrderPlan(group.rows, "grouped"));
      continue;
    }

    for (const row of group.rows) {
      automaticOrders.push(buildRegularOrderPlan([row], "single"));
    }
  }

  for (const group of groupRows(source.petRows)) {
    const phoneIsInstagram = isInstagramLikePhone(group.rows[0]?.customerWhatsappKey ?? "");
    if (group.rows.length === 1 || phoneIsInstagram) {
      for (const row of group.rows) {
        automaticOrders.push(buildSinglePetOrderPlan(row));
      }
      continue;
    }

    const complementEvidence = hasZeroComplement(group.rows);
    const partialSharedPaymentEvidence = hasRepeatedSharedPartialPayment(group.rows);
    if (!complementEvidence && !partialSharedPaymentEvidence) {
      for (const row of group.rows) {
        automaticOrders.push(buildSinglePetOrderPlan(row));
      }
      continue;
    }

    const payment = resolveGroupPayment(group.rows);
    if (payment.inconsistent) {
      reviewGroups.push(buildReviewGroup(group.rows, "Pagos inconsistentes en grupo de cédulas"));
      continue;
    }

    automaticOrders.push(buildGroupedPetOrderPlan(group.rows));
  }

  return {
    totalRows: source.regularRows.length + source.petRows.length,
    regularRows: source.regularRows.length,
    petRows: source.petRows.length,
    igRows: source.petRows.filter((row) => isInstagramLikePhone(row.customerWhatsappKey)).length,
    zeroTotalRows: [...source.regularRows, ...source.petRows].filter((row) => row.total === 0).length,
    automaticOrders,
    groupedOrders: automaticOrders.filter((order) => order.mode === "grouped").length,
    reviewGroups,
  };
}
