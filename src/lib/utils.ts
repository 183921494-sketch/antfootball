import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
  }).format(amount);
}

export function calculateCommission(
  amount: number,
  rate: number
): number {
  return amount * rate;
}

export function getCommissionRate(
  amount: number,
  type: "lottery" | "platform"
): number {
  if (type === "lottery") {
    if (amount <= 10000) return 0.1;
    if (amount <= 30000) return 0.08;
    return 0.06;
  } else {
    if (amount <= 50000) return 0.15;
    if (amount <= 150000) return 0.12;
    return 0.1;
  }
}
