import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BoostDraftValues } from "@/lib/boost-types";

export type { Cta, Currency, Gender, Objective } from "@/lib/boost-types";
export {
  CTA_LABEL,
  CURRENCY_SYMBOL,
  DAILY_BUDGETS,
  MIN_DAILY_BUDGET,
  snapDailyBudget,
  draftTotals,
} from "@/lib/boost-types";

export type BoostDraft = BoostDraftValues & { hydrated: boolean };

const defaults: BoostDraftValues = {
  url: "",
  media: null,
  continent: "IL_FOCUS",
  countries: ["IL"],
  countryQuery: "",
  ageMin: 18,
  ageMax: 34,
  gender: "all",
  currency: "ILS",
  dailyBudget: 10,
  days: 7,
  adTitle: "",
  adBody: "",
  cta: "LISTEN_NOW",
  objective: "OUTCOME_TRAFFIC",
  campaignName: "",
  receiptEmail: "",
};

type Store = BoostDraft & {
  patch: (p: Partial<BoostDraft>) => void;
  reset: () => void;
};

export const useBoostDraft = create<Store>()(
  persist(
    (set) => ({
      hydrated: false,
      ...defaults,
      patch: (p) => set(p),
      reset: () => set({ ...defaults, hydrated: true }),
    }),
    {
      name: "musicboost-draft",
      skipHydration: true,
      partialize: (s) => ({
        url: s.url,
        media: s.media,
        continent: s.continent,
        countries: s.countries,
        ageMin: s.ageMin,
        ageMax: s.ageMax,
        gender: s.gender,
        currency: s.currency,
        dailyBudget: s.dailyBudget,
        days: s.days,
        adTitle: s.adTitle,
        adBody: s.adBody,
        cta: s.cta,
        objective: s.objective,
        campaignName: s.campaignName,
        receiptEmail: s.receiptEmail,
      }),
    },
  ),
);

export function rehydrateBoostDraft() {
  const timer = setTimeout(() => {
    useBoostDraft.setState({ hydrated: true });
  }, 800);
  void Promise.resolve(useBoostDraft.persist.rehydrate()).finally(() => {
    clearTimeout(timer);
    useBoostDraft.setState({ hydrated: true });
  });
}
