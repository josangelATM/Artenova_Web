import { randomInt } from "node:crypto";

export function createOrderCode() {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `ART-${y}${m}${d}-${randomInt(1000, 9999)}`;
}

