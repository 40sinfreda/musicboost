import { useEffect, useState } from "react";
import { Navigate, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Copy, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { CURRENCY_SYMBOL, snapDailyBudget, draftTotals, useBoostDraft } from "@/lib/boost-draft";
import { getBoostSession, submitCampaign } from "@/lib/boost-server";
import { GEO } from "@/lib/geo";

export const Route = createFileRoute("/boost/pay")({ component: BoostPay });

function BoostPay() {
  const { user, isPending } = useCurrentUserState();
  const hydrated = useBoostDraft((s) => s.hydrated);
  const media = useBoostDraft((s) => s.media);

  if (isPending || !hydrated) return <div className="h-64" />;
  if (!user) return <Navigate to="/login" search={{ redirect: "/boost/pay" }} />;
  if (!media) return <Navigate to="/boost/link" />;
  return <PayForm email={user.primaryEmail || ""} name={user.displayName || "אמן"} />;
}

function PayForm({ email, name }: { email: string; name: string }) {
  const navigate = useNavigate();
  const draft = useBoostDraft();
  const patch = draft.patch;
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [payout, setPayout] = useState("");

  useEffect(() => {
    if (!draft.receiptEmail && email) patch({ receiptEmail: email });
    if (draft.currency !== "ILS") patch({ currency: "ILS" });
  }, [draft.receiptEmail, draft.currency, email, patch]);

  useEffect(() => {
    void getBoostSession()
      .then((s) => setPayout(s.payoutNote || "ביט ל 0543462222 בשם Ignite Records"))
      .catch(() => undefined);
  }, []);

  const { totalCents } = draftTotals(draft.dailyBudget, draft.days);
  const symbol = CURRENCY_SYMBOL.ILS;
  const amount = `${symbol}${totalCents / 100}`;
  const media = draft.media!;
  const countryNames = GEO[draft.continent].countries
    .filter((c) => draft.countries.includes(c.code))
    .map((c) => c.name)
    .join(", ");

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 2000);
    } catch {
      setCopied("");
    }
  }

  async function finish() {
    const receipt = draft.receiptEmail.trim() || email;
    if (!receipt.includes("@")) {
      setError("צריך מייל תקין לקבלת האישור");
      return;
    }
    setError("");
    setPublishing(true);
    try {
      const min = Math.max(13, Math.min(65, draft.ageMin || 18));
      const max = Math.max(min, Math.min(65, draft.ageMax || 65));
      const budget = snapDailyBudget(draft.dailyBudget || 0);
      const created = await submitCampaign({
        data: {
          title: draft.campaignName.trim() || media.title,
          platform: media.platform,
          contentType: media.contentType,
          mediaUrl: media.canonicalUrl,
          thumbnail: media.thumbnail || undefined,
          spec: {
            facebook: {
              objective: draft.objective,
              campaign_name: draft.campaignName.trim(),
              daily_budget_cents: Math.round(budget * 100),
              targeting: {
                geo_locations: { countries: draft.countries },
                age_min: min,
                age_max: max,
                ...(draft.gender !== "all" ? { genders: [Number(draft.gender)] } : {}),
              },
              creative: {
                title: draft.adTitle.trim(),
                body: draft.adBody.trim(),
                call_to_action: draft.cta,
                link: media.canonicalUrl,
              },
            },
          },
          dailyBudgetMajor: budget,
          days: draft.days,
          currency: "ILS",
          receiptEmail: receipt,
          audienceLabel: countryNames || "לא נבחר",
          method: "bit",
        },
      });
      await navigate({
        to: "/campaigns/$id",
        params: { id: String(created.id) },
        search: { closed: true },
      });
      draft.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "סגירת העיסקה נכשלה");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div>
      <img
        src="/images/step-done.jpg"
        alt=""
        className="mb-6 h-48 w-full rounded-xl object-cover sm:h-56"
      />
      <h1 className="text-3xl font-semibold tracking-tight">תשלום בביט</h1>
      <p className="mt-2 text-base leading-relaxed text-muted">
        שלום {name}. מעבירים את הסכום בביט ללייבל, סוגרים עיסקה, ואחרי שהכסף מאושר הקמפיין עולה.
      </p>
      <dl className="mt-6 divide-y divide-border rounded-xl border border-border bg-surface px-4 text-sm">
        <div className="flex justify-between gap-3 py-3">
          <dt className="text-muted">תוכן</dt>
          <dd>{media.title}</dd>
        </div>
        <div className="flex justify-between gap-3 py-3">
          <dt className="text-muted">קהל</dt>
          <dd className="text-left">
            {countryNames || "לא נבחר"}, גילאים {draft.ageMin} עד {draft.ageMax}
          </dd>
        </div>
        <div className="flex justify-between gap-3 py-3">
          <dt className="text-muted">תקציב</dt>
          <dd>
            {draft.days} ימים, {symbol}
            {draft.dailyBudget} ליום
          </dd>
        </div>
        <div className="flex justify-between gap-3 py-3 font-medium">
          <dt>להעברה בביט</dt>
          <dd>{amount}</dd>
        </div>
      </dl>

      <section className="mt-6 rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2">
          <Smartphone className="size-4 text-muted" />
          <h2 className="font-medium">איך משלמים</h2>
        </div>
        <ol className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
          <li>1. פתחו ביט והעבירו {amount}.</li>
          <li>2. בתיאור כתבו את שם השיר.</li>
          <li>3. חזרו לכאן וסגרו עיסקה. הסטודיו מאשר, והמודעה עולה.</li>
        </ol>
        <div className="mt-4 rounded-lg bg-elevated px-4 py-3 text-sm">
          {payout}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {payout ? (
            <Button type="button" variant="outline" onClick={() => void copyText(payout, "bit")}>
              <Copy className="size-4" />
              {copied === "bit" ? "הועתק" : "העתק פרטי ביט"}
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => void copyText(String(totalCents / 100), "sum")}>
            <Copy className="size-4" />
            {copied === "sum" ? "הועתק" : `העתק סכום ${amount}`}
          </Button>
        </div>
      </section>

      <div className="mt-6">
        <Label>מייל לאישור העיסקה</Label>
        <Input
          className="mt-2"
          type="email"
          value={draft.receiptEmail}
          onChange={(e) => patch({ receiptEmail: e.target.value })}
          placeholder="name@email.com"
        />
      </div>
      {error ? (
        <p className="mt-4 rounded-md border border-danger/30 bg-elevated px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => void navigate({ to: "/boost/ad" })}>
          <ArrowRight className="size-4" />
          חזרה
        </Button>
        <Button size="lg" onClick={() => void finish()} disabled={publishing}>
          {publishing ? <Loader2 className="size-4 animate-spin" /> : "סגור עיסקה בביט"}
          {!publishing ? <ArrowLeft className="size-4" /> : null}
        </Button>
      </div>
    </div>
  );
}
