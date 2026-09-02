import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Loader2, Mail } from "lucide-react";
import { AppHeader, STATUS_LABEL, displayText, money } from "@/components/app-header";
import { EmailLetter } from "@/components/boost-ui";
import { Button } from "@/components/ui/button";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  getBoostSession,
  getCampaign,
  getCampaignEmails,
  markArtistPaid,
  simulatePayment,
  type PublicCampaign,
  type PublicEmail,
} from "@/lib/boost-server";

type CampaignSearch = { closed?: boolean };

export const Route = createFileRoute("/campaigns/$id")({
  validateSearch: (search: Record<string, unknown>): CampaignSearch => ({
    closed: search.closed === true || search.closed === "true",
  }),
  component: CampaignPage,
});

function CampaignPage() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <div className="min-h-screen bg-bg" />;
  if (!user) return <RedirectToSignIn />;
  return <CampaignDetail />;
}

function CampaignDetail() {
  const { id } = Route.useParams();
  const { closed } = Route.useSearch();
  const campaignId = Number(id);
  const [row, setRow] = useState<PublicCampaign | null>(null);
  const [emails, setEmails] = useState<PublicEmail[]>([]);
  const [payout, setPayout] = useState("");
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function reload() {
    const [c, s, mail] = await Promise.all([
      getCampaign({ data: { id: campaignId } }),
      getBoostSession(),
      getCampaignEmails({ data: { id: campaignId } }),
    ]);
    setRow(c);
    setPayout(s.payoutNote || "");
    setPreview(s.previewPayments);
    setEmails(mail);
  }

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      getCampaign({ data: { id: campaignId } }),
      getBoostSession(),
      getCampaignEmails({ data: { id: campaignId } }),
    ])
      .then(([c, s, mail]) => {
        if (cancelled) return;
        setRow(c);
        setPayout(s.payoutNote || "");
        setPreview(s.previewPayments);
        setEmails(mail);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "שגיאה");
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  if (!row && !error) {
    return (
      <div className="min-h-screen bg-bg">
        <AppHeader />
        <div className="grid place-items-center py-24 text-muted">
          <Loader2 className="size-6 animate-spin" />
        </div>
      </div>
    );
  }

  const insights = row?.insights;
  const live = row?.status === "live";
  const orderMail = emails.find((e) => e.kind === "order") || emails[0];

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link to="/" className="text-sm text-muted">
          הקמפיינים שלי
        </Link>
        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
        {row ? (
          <>
            {closed ? (
              <section className="mt-6 overflow-hidden rounded-xl border border-border bg-surface">
                <img src="/images/step-done.jpg" alt="" className="h-48 w-full object-cover sm:h-56" />
                <div className="p-5">
                  <p className="inline-flex items-center gap-2 text-sm text-fg">
                    <Check className="size-4" />
                    העיסקה נסגרה
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight">{displayText(row.title)}</h1>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    אישור נשלח
                    {orderMail ? ` אל ${orderMail.toEmail}` : " למייל שלך"}. אפשר לראות את המכתב למטה,
                    ולהמשיך לתשלום ללייבל.
                  </p>
                </div>
              </section>
            ) : (
              <>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight">{displayText(row.title)}</h1>
                <p className="mt-2 text-sm text-muted">
                  {STATUS_LABEL[row.status] || row.status}, {row.platform}, {row.days} ימים
                </p>
              </>
            )}

            <dl className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-surface p-4">
                <dt className="text-xs text-muted">תקציב יומי</dt>
                <dd className="mt-1 text-xl font-semibold">{money(row.dailyBudgetCents, row.currency)}</dd>
              </div>
              <div className="rounded-xl border border-border bg-surface p-4">
                <dt className="text-xs text-muted">משך</dt>
                <dd className="mt-1 text-xl font-semibold">{row.days} ימים</dd>
              </div>
              <div className="rounded-xl border border-border bg-surface p-4">
                <dt className="text-xs text-muted">לתשלום</dt>
                <dd className="mt-1 text-xl font-semibold">{money(row.totalCents, row.currency)}</dd>
              </div>
            </dl>

            {orderMail ? (
              <section className="mt-8">
                <div className="mb-3 flex items-center gap-2 text-sm text-muted">
                  <Mail className="size-4" />
                  האישור שנשלח למייל
                </div>
                <EmailLetter to={orderMail.toEmail} subject={displayText(orderMail.subject)} preview={displayText(orderMail.preview)} />
              </section>
            ) : null}

            {(row.status === "awaiting_payment" || row.status === "awaiting_confirmation") && (
              <section className="mt-8 rounded-xl border border-border bg-surface p-5">
                <h2 className="font-medium">תשלום ללייבל</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  התשלום עובר ל Ignite Records. אחרי האישור הקמפיין עולה לאוויר.
                </p>
                {payout ? (
                  <p className="mt-3 rounded-md bg-elevated px-3 py-2 text-sm">{payout}</p>
                ) : (
                  <p className="mt-3 text-sm text-muted">פרטי ביט יופיעו אחרי שהסטודיו ימלא אותם.</p>
                )}
                {row.status === "awaiting_confirmation" ? (
                  <p className="mt-4 text-sm text-warn">
                    סימנת ששולם. מחכים שהסטודיו יאשר ויפעיל את המודעה.
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {row.status === "awaiting_payment" ? (
                    <Button
                      disabled={busy}
                      onClick={() => {
                        setBusy(true);
                        void markArtistPaid({ data: { id: row.id } })
                          .then(reload)
                          .catch((e) => setError(e instanceof Error ? e.message : "שגיאה"))
                          .finally(() => setBusy(false));
                      }}
                    >
                      שילמתי, אשר קבלה
                    </Button>
                  ) : null}
                  {preview ? (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        setBusy(true);
                        void simulatePayment({ data: { id: row.id } })
                          .then(reload)
                          .catch((e) => setError(e instanceof Error ? e.message : "שגיאה"))
                          .finally(() => setBusy(false));
                      }}
                    >
                      סימולציית תשלום (תצוגה)
                    </Button>
                  ) : null}
                </div>
              </section>
            )}

            {row.status === "failed" ? (
              <p className="mt-6 rounded-xl border border-danger/30 bg-surface p-4 text-sm text-danger">
                {row.errorMessage || "הפרסום במטא נכשל. הסטודיו יכול לנסות שוב."}
              </p>
            ) : null}

            <section className="mt-8 rounded-xl border border-border bg-surface p-5">
              {live && insights ? (
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Stat label="חשיפות" value={insights.impressions} />
                  <Stat label="קליקים" value={insights.clicks} />
                  <Stat label="הוצאה" value={insights.spend} />
                  <Stat label="הגעה" value={insights.reach} />
                  <Stat label="CTR" value={insights.ctr ? `${insights.ctr.toFixed(2)}%` : "0%"} />
                  <Stat label="סטטוס מטא" value={insights.status || "לא צוין"} />
                </dl>
              ) : (
                <p className="rounded-md bg-elevated px-3 py-3 text-sm text-muted">
                  {row.status === "paid"
                    ? "התשלום אושר. המודעה עולה עכשיו לאוויר. הנתונים יופיעו מיד אחרי."
                    : "הנתונים יופיעו כאן אחרי שהקמפיין ייצא לאוויר."}
                </p>
              )}
              {row.adsManagerUrl && row.isOperator ? (
                <a className="mt-4 inline-block text-sm text-muted" href={row.adsManagerUrl} target="_blank" rel="noreferrer">
                  Ads Manager
                </a>
              ) : null}
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-elevated p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-lg font-medium">{value}</div>
    </div>
  );
}
