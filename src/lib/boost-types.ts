import type { ContinentKey } from "@/lib/geo";
import type { MediaMeta } from "@/lib/parser";

export type Gender = "all" | "1" | "2";
export type Currency = "ILS" | "USD" | "EUR";
export type Cta = "LISTEN_NOW" | "LEARN_MORE" | "WATCH_MORE";
export type Objective = "OUTCOME_TRAFFIC" | "OUTCOME_ENGAGEMENT" | "OUTCOME_AWARENESS";

export type BoostDraftValues = {
  url: string;
  media: MediaMeta | null;
  continent: ContinentKey;
  countries: string[];
  countryQuery: string;
  ageMin: number;
  ageMax: number;
  gender: Gender;
  currency: Currency;
  dailyBudget: number;
  days: number;
  adTitle: string;
  adBody: string;
  cta: Cta;
  objective: Objective;
  campaignName: string;
  receiptEmail: string;
};

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  ILS: "₪",
  USD: "$",
  EUR: "€",
};

export const MIN_DAILY_BUDGET = 10;
export const MAX_DAILY_BUDGET = 100;
export const DAILY_BUDGETS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export function snapDailyBudget(value: number) {
  if (DAILY_BUDGETS.includes(value)) return value;
  return DAILY_BUDGETS.reduce((best, step) =>
    Math.abs(step - value) < Math.abs(best - value) ? step : best,
  );
}

export const CTA_LABEL: Record<Cta, string> = {
  LISTEN_NOW: "Listen Now",
  LEARN_MORE: "Learn More",
  WATCH_MORE: "Watch More",
};

export function draftTotals(dailyBudget: number, days: number) {
  const totalCents = Math.round(dailyBudget * 100) * days;
  const feeCents = Math.round(totalCents * 0.1);
  const adCents = totalCents - feeCents;
  return { adCents, feeCents, totalCents };
}
