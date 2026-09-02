import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Chip } from "@/components/boost-ui";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  CURRENCY_SYMBOL,
  DAILY_BUDGETS,
  MIN_DAILY_BUDGET,
  draftTotals,
  snapDailyBudget,
  useBoostDraft,
  type Currency,
} from "@/lib/boost-draft";

export const Route = createFileRoute("/boost/budget")({ component: BoostBudget });

function BoostBudget() {
  const navigate = useNavigate();
  const hydrated = useBoostDraft((s) => s.hydrated);
  const media = useBoostDraft((s) => s.media);
  const currency = useBoostDraft((s) => s.currency);
  const dailyBudget = useBoostDraft((s) => s.dailyBudget);
  const days = useBoostDraft((s) => s.days);
  const patch = useBoostDraft((s) => s.patch);

  useEffect(() => {
    if (!hydrated) return;
    if (!DAILY_BUDGETS.includes(dailyBudget)) {
      patch({ dailyBudget: snapDailyBudget(dailyBudget) });
    }
  }, [hydrated, dailyBudget, patch]);

  if (!hydrated) return <div className="h-64" />;
  if (!media) return <Navigate to="/boost/link" />;

  const { totalCents } = draftTotals(dailyBudget, days);
  const symbol = CURRENCY_SYMBOL[currency];

  return (
    <div>
      <img
        src="/images/step-budget.jpg"
        alt=""
        className="mb-6 h-48 w-full rounded-xl object-cover sm:h-56"
      />
      <h1 className="text-3xl font-semibold tracking-tight">כמה משקיעים ביום</h1>
      <p className="mt-2 text-base leading-relaxed text-muted">
        בוחרים מטבע, סכום יומי ומשך הקמפיין. {symbol}
        {MIN_DAILY_BUDGET} עד {symbol}100 ליום, בקפיצות של 10.
      </p>
      <div className="mt-6">
        <Label>מטבע</Label>
        <select
          className="mt-2 flex h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm text-fg sm:max-w-xs"
          value={currency}
          onChange={(e) => patch({ currency: e.target.value as Currency })}
        >
          <option value="ILS">שקל (₪)</option>
          <option value="USD">דולר ($)</option>
          <option value="EUR">אירו (€)</option>
        </select>
      </div>
      <Label className="mt-6">תקציב יומי</Label>
      <div className="mt-2 flex flex-wrap gap-2">
        {DAILY_BUDGETS.map((amount) => (
          <Chip
            key={amount}
            on={dailyBudget === amount}
            onClick={() => patch({ dailyBudget: amount })}
          >
            {symbol}
            {amount}
          </Chip>
        ))}
      </div>
      <Label className="mt-6">משך הקמפיין</Label>
      <div className="mt-2 flex flex-wrap gap-2">
        {[3, 7, 14, 30].map((d) => (
          <Chip key={d} on={days === d} onClick={() => patch({ days: d })}>
            {d} ימים
          </Chip>
        ))}
      </div>
      <dl className="mt-6 divide-y divide-border rounded-xl border border-border bg-surface px-4 text-sm">
        <div className="flex justify-between gap-3 py-3">
          <dt className="text-muted">תקציב יומי</dt>
          <dd>
            {symbol}
            {dailyBudget}
          </dd>
        </div>
        <div className="flex justify-between gap-3 py-3">
          <dt className="text-muted">משך</dt>
          <dd>{days} ימים</dd>
        </div>
        <div className="flex justify-between gap-3 py-3 font-medium">
          <dt>סה״כ לקמפיין</dt>
          <dd>
            {symbol}
            {totalCents / 100}
          </dd>
        </div>
      </dl>
      <div className="mt-8 flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => void navigate({ to: "/boost/audience" })}>
          <ArrowRight className="size-4" />
          חזרה
        </Button>
        <Button
          size="lg"
          disabled={!DAILY_BUDGETS.includes(dailyBudget)}
          onClick={() => void navigate({ to: "/boost/ad" })}
        >
          המשך למודעה
          <ArrowLeft className="size-4" />
        </Button>
      </div>
    </div>
  );
}
