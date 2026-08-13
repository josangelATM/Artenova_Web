import type { AdminFinanceOverview, AdminFinanceQuery, AdminFinanceRangePreset, ExpenseCategory, OrderPaymentMethod, OrderStatus } from "@artenova/shared";
import { expenseCategoryValues, orderPaymentMethodValues, orderStatusValues } from "@artenova/shared";
import { endOfUtcDay, parseDateOnly, startOfUtcDay, startOfUtcMonth } from "./expenseDates";
import { expensePayload, orderPayload } from "./serialize";

type OrderLike = Parameters<typeof orderPayload>[0];
type ExpenseLike = Parameters<typeof expensePayload>[0];
type PaymentLike = {
  amount: { toString(): string } | number;
  method: OrderPaymentMethod;
  createdAt: Date | string;
};

function toNumber(value: { toString(): string } | number | null | undefined) {
  return value == null ? 0 : Number(value.toString());
}

function addUtcDays(value: Date, days: number) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate() + days, 0, 0, 0, 0));
}

function formatDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function sameUtcDay(left: Date, right: Date) {
  return formatDateOnly(left) === formatDateOnly(right);
}

function resolvePresetBounds(now: Date, preset: AdminFinanceRangePreset) {
  const todayStart = startOfUtcDay(now);
  const todayEnd = endOfUtcDay(now);

  switch (preset) {
    case "today":
      return { dateFrom: todayStart, dateTo: todayEnd };
    case "last7":
      return { dateFrom: startOfUtcDay(addUtcDays(now, -6)), dateTo: todayEnd };
    case "last30":
      return { dateFrom: startOfUtcDay(addUtcDays(now, -29)), dateTo: todayEnd };
    case "custom":
      return { dateFrom: todayStart, dateTo: todayEnd };
    case "thisMonth":
    default:
      return { dateFrom: startOfUtcMonth(now), dateTo: todayEnd };
  }
}

export function resolveAdminFinanceRange(query: AdminFinanceQuery, now = new Date()) {
  const presetBounds = resolvePresetBounds(now, query.rangePreset);
  const dateFrom = query.dateFrom ? startOfUtcDay(parseDateOnly(query.dateFrom)) : presetBounds.dateFrom;
  const dateTo = query.dateTo ? endOfUtcDay(parseDateOnly(query.dateTo)) : presetBounds.dateTo;
  const normalizedFrom = dateFrom <= dateTo ? dateFrom : startOfUtcDay(dateTo);
  const normalizedTo = dateFrom <= dateTo ? dateTo : endOfUtcDay(dateFrom);
  const rangePreset = query.dateFrom || query.dateTo ? "custom" : query.rangePreset;

  return {
    rangePreset,
    dateFrom: normalizedFrom,
    dateTo: normalizedTo,
  } as const;
}

export function buildAdminFinanceOverview(
  query: AdminFinanceQuery,
  input: {
    now?: Date;
    orders: OrderLike[];
    expenses: ExpenseLike[];
    payments: PaymentLike[];
  },
): AdminFinanceOverview {
  const { now = new Date(), orders, expenses, payments } = input;
  const resolvedRange = resolveAdminFinanceRange(query, now);
  const ordersInRange = orders
    .map(orderPayload)
    .filter((order) => {
      const createdAt = new Date(order.createdAt);
      return createdAt >= resolvedRange.dateFrom && createdAt <= resolvedRange.dateTo;
    });
  const expensesInRange = expenses
    .map(expensePayload)
    .filter((expense) => {
      const expenseDate = new Date(expense.expenseDate);
      return expenseDate >= resolvedRange.dateFrom && expenseDate <= resolvedRange.dateTo;
    });
  const paymentsInRange = payments.filter((payment) => {
    const createdAt = new Date(payment.createdAt);
    return createdAt >= resolvedRange.dateFrom && createdAt <= resolvedRange.dateTo;
  });

  const paidIncome = Number(paymentsInRange.reduce((sum, payment) => sum + toNumber(payment.amount), 0).toFixed(2));
  const committedSales = Number(ordersInRange.reduce((sum, order) => sum + (order.finalPrice ?? order.itemsTotal), 0).toFixed(2));
  const outstandingBalance = Number(ordersInRange.reduce((sum, order) => sum + order.balance, 0).toFixed(2));
  const expenseTotal = Number(expensesInRange.reduce((sum, expense) => sum + expense.amount, 0).toFixed(2));
  const netCashflow = Number((paidIncome - expenseTotal).toFixed(2));

  const timeSeries = [];
  for (let cursor = new Date(resolvedRange.dateFrom); cursor <= resolvedRange.dateTo; cursor = addUtcDays(cursor, 1)) {
    const date = formatDateOnly(cursor);
    const dayPaidIncome = Number(paymentsInRange
      .filter((payment) => sameUtcDay(new Date(payment.createdAt), cursor))
      .reduce((sum, payment) => sum + toNumber(payment.amount), 0)
      .toFixed(2));
    const dayExpenseTotal = Number(expensesInRange
      .filter((expense) => sameUtcDay(new Date(expense.expenseDate), cursor))
      .reduce((sum, expense) => sum + expense.amount, 0)
      .toFixed(2));

    timeSeries.push({
      date,
      paidIncome: dayPaidIncome,
      expenseTotal: dayExpenseTotal,
      net: Number((dayPaidIncome - dayExpenseTotal).toFixed(2)),
    });
  }

  const expenseBreakdown = expenseCategoryValues
    .map((category) => {
      const items = expensesInRange.filter((expense) => expense.category === category);
      return {
        category: category as ExpenseCategory,
        total: Number(items.reduce((sum, expense) => sum + expense.amount, 0).toFixed(2)),
        count: items.length,
      };
    })
    .filter((item) => item.count > 0)
    .sort((left, right) => right.total - left.total);

  const orderStatusBreakdown = orderStatusValues
    .map((status) => {
      const items = ordersInRange.filter((order) => order.status === status);
      return {
        status: status as OrderStatus,
        total: Number(items.reduce((sum, order) => sum + (order.finalPrice ?? order.itemsTotal), 0).toFixed(2)),
        count: items.length,
      };
    })
    .filter((item) => item.count > 0)
    .sort((left, right) => right.total - left.total);

  const paymentMethodBreakdown = orderPaymentMethodValues
    .map((method) => {
      const items = paymentsInRange.filter((payment) => payment.method === method);
      return {
        method: method as OrderPaymentMethod,
        total: Number(items.reduce((sum, payment) => sum + toNumber(payment.amount), 0).toFixed(2)),
        count: items.length,
      };
    })
    .filter((item) => item.count > 0)
    .sort((left, right) => right.total - left.total);

  const topOutstandingOrders = ordersInRange
    .filter((order) => order.balance > 0)
    .sort((left, right) => right.balance - left.balance || left.createdAt.localeCompare(right.createdAt))
    .slice(0, 5)
    .map((order) => ({
      id: order.id,
      code: order.code,
      customerName: order.customerName,
      status: order.status,
      createdAt: order.createdAt,
      finalPrice: order.finalPrice ?? null,
      itemsTotal: order.itemsTotal,
      paidTotal: order.paidTotal,
      balance: order.balance,
    }));

  const recentExpenses = [...expensesInRange]
    .sort((left, right) => new Date(right.expenseDate).getTime() - new Date(left.expenseDate).getTime())
    .slice(0, 6)
    .map((expense) => ({
      id: expense.id,
      expenseDate: expense.expenseDate,
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      paymentMethod: expense.paymentMethod ?? null,
      reference: expense.reference ?? null,
    }));

  return {
    rangePreset: resolvedRange.rangePreset,
    dateFrom: formatDateOnly(resolvedRange.dateFrom),
    dateTo: formatDateOnly(resolvedRange.dateTo),
    summary: {
      paidIncome,
      committedSales,
      outstandingBalance,
      expenseTotal,
      netCashflow,
      netProfit: netCashflow,
      orderCount: ordersInRange.length,
      expenseCount: expensesInRange.length,
    },
    timeSeries,
    expenseBreakdown,
    orderStatusBreakdown,
    paymentMethodBreakdown,
    topOutstandingOrders,
    recentExpenses,
  };
}
