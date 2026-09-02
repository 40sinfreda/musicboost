import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { AppHeader, STATUS_LABEL, displayText, money } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  confirmPayment,
  getBoostSession,
  listStudioCampaigns,
  probeOperatorMeta,
  retryLaunch,
  saveOperatorMeta,
  savePayoutNote,
  type BoostSession,
  type PublicCampaign,
} from "@/lib/boost-server";

export const Route = createFileRoute("/studio")({ component: StudioPage });

function StudioPage() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <div className="min-h-screen bg-bg" />;
  if (!user) return <RedirectToSignIn />;
  return <Studio />;
}

function Studio() {
  const [session, setSession] = useState<BoostSession | null>(null);
  const [token, setToken] = useState("");
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [pages, setPages] = useState<Array<{ id: string; name: string }>>([]);
  const [adAccountId, setAdAccountId] = useState("");
  const [pageId, setPageId] = useState("");
  const [payout, setPayout] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<PublicCampaign[]>([]);

  async function reload() {
    const s = await getBoostSession();
    setSession(s);
    if (s.payoutNote) setPayout(s.payoutNote);
    if (s.isOperator) {
      const list = await listStudioCampaigns();
      setRows(list);
    }
  }

  useEffect(() => {
    void reload().catch((e) => setError(e instanceof Error ? e.message : "שגיאה"));
  }, []);

  async function probe() {
    setError("");
    setBusy(true);
    try {
      const res = await probeOperatorMeta({ data: { token } });
      setAccounts(res.accounts);
      setPages(res.pages);
      const ignite = res.accounts.find((a) => /ignite/i.test(a.name)) || res.accounts[0];
      const page = res.pages.find((p) => /ignite/i.test(p.name)) || res.pages[0];
      if (ignite) setAdAccountId(ignite.id);
      if (page) setPageId(page.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "הטוקן לא תקין");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setError("");
    setBusy(true);
    try {
      const acc = accounts.find((a) => a.id === adAccountId);
      const page = pages.find((p) => p.id === pageId);
      if (!acc || !page) throw new Error("בחר חשבון מודעות ודף");
      await saveOperatorMeta({
        data: {
          token,
          adAccountId,
          adAccountName: acc.name,
          pageId,
          pageName: page.name,
          payoutNote: payout,
        },
      });
      setToken("");
      setAccounts([]);
      setPages([]);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שמירה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  if (session && !session.isOperator && !session.canClaimStudio) {
    return (
      <div className="min-h-screen bg-bg">
        <AppHeader />
        <main className="mx-auto max-w-3xl px-4 py-16">
          <p className="text-muted">הסטודיו שמור למפעיל הלייבל.</p>
          <Button asChild className="mt-4">
            <Link to="/">חזרה</Link>
          </Button>
        </main>
      </div>
    );
  }

  const earned = rows
    .filter((c) => c.status === "live" || c.status === "paid")
    .reduce((sum, c) => sum + c.feeCents, 0);
  const pendingPay = rows.filter(
    (c) => c.status === "awaiting_payment" || c.status === "awaiting_confirmation",
  ).length;

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader studio />
      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <div>
          <h1 className="text-3xl font-semibold">סטודיו</h1>
          <p className="mt-2 text-sm text-muted">
            הטוקן נשמר בשרת, לא אצל האמן ולא בגיטהאב. אחרי שמירה לא צריך להדביק שוב.
          </p>
        </div>

        {session?.isOperator ? (
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-surface p-4">
              <dt className="text-xs text-muted">הכנסות שאושרו</dt>
              <dd className="mt-1 text-xl font-semibold">{money(earned, "ILS")}</dd>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <dt className="text-xs text-muted">ממתינים לתשלום</dt>
              <dd className="mt-1 text-xl font-semibold">{pendingPay}</dd>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <dt className="text-xs text-muted">קמפיינים</dt>
              <dd className="mt-1 text-xl font-semibold">{rows.length}</dd>
            </div>
          </dl>
        ) : null}

        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="font-medium">חיבור מטא קבוע</h2>
          {session?.operatorConnected ? (
            <p className="mt-2 text-sm text-muted">
              מחובר כ {session.operatorName}, {session.adAccountName}, {session.pageName}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted">הדבק טוקן פעם אחת. יישמר אצלך בשרת.</p>
          )}
          <Label className="mt-4">Access Token</Label>
          <Input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="EAAB..." autoComplete="off" />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => void probe()} disabled={busy || token.length < 10}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : "בדוק טוקן"}
            </Button>
          </div>
          {accounts.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <Label>חשבון מודעות</Label>
                <select className="flex h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm" value={adAccountId} onChange={(e) => setAdAccountId(e.target.value)}>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>דף</Label>
                <select className="flex h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm" value={pageId} onChange={(e) => setPageId(e.target.value)}>
                  {pages.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <Button type="button" onClick={() => void save()} disabled={busy}>שמור בשרת</Button>
            </div>
          ) : null}
        </section>

        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="font-medium">איך אמנים משלמים</h2>
          <p className="mt-2 text-sm text-muted">ביט / העברה. הסכום מגיע אליכם, והקמפיין רץ מחשבון המטא של הלייבל.</p>
          <Label className="mt-4">פרטי תשלום שיוצגו לאמן</Label>
          <Input value={payout} onChange={(e) => setPayout(e.target.value)} placeholder="ביט ל 05... / חשבון בנק..." />
          <Button
            className="mt-3"
            variant="outline"
            type="button"
            disabled={!session?.isOperator || payout.trim().length < 2}
            onClick={() => void savePayoutNote({ data: { payoutNote: payout } }).then(reload)}
          >
            שמור פרטי תשלום
          </Button>
        </section>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <section>
          <h2 className="font-medium">קמפיינים</h2>
          {rows.length === 0 ? (
            <p className="mt-4 rounded-xl border border-border bg-surface p-6 text-sm text-muted">
              עדיין אין הזמנות מאמנים. אחרי שהטוקן שמור, אמנים יוכלו לשלם ולהפעיל קמפיין.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {rows.map((c) => (
                <li key={c.id} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{displayText(c.title)}</p>
                      <p className="text-xs text-muted">
                        {STATUS_LABEL[c.status] || c.status}, {money(c.totalCents, c.currency)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {(c.status === "awaiting_confirmation" || c.status === "awaiting_payment") && (
                        <Button size="sm" onClick={() => void confirmPayment({ data: { id: c.id } }).then(reload)}>
                          סמן שולם והפעל
                        </Button>
                      )}
                      {c.status === "failed" && (
                        <Button size="sm" variant="outline" onClick={() => void retryLaunch({ data: { id: c.id } }).then(reload)}>
                          נסה שוב
                        </Button>
                      )}
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/campaigns/$id" params={{ id: String(c.id) }}>פתיחה</Link>
                      </Button>
                    </div>
                  </div>
                  {c.errorMessage ? <p className="mt-2 text-sm text-danger">{c.errorMessage}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
