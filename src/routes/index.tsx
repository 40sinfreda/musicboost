import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { AppHeader, STATUS_LABEL, displayText, money } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { getBoostSession, listMyCampaigns, type PublicCampaign } from "@/lib/boost-server";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/")({ component: Home });

type Campaign = PublicCampaign;

function Home() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <div className="min-h-screen bg-bg">
        <AppHeader />
        <div className="mx-auto max-w-3xl px-4 py-16">
          <div className="h-10 w-48 animate-pulse rounded-md bg-elevated" />
        </div>
      </div>
    );
  }
  if (!user) return <Landing />;
  return <Dashboard name={user.displayName || "אמן"} />;
}

const PROCESS = [
  {
    n: "01",
    title: "מדביקים קישור",
    text: "שיר או פלייליסט מיוטיוב וספוטיפיי. הזיהוי אוטומטי.",
    image: "/images/step-link.jpg",
  },
  {
    n: "02",
    title: "בוחרים קהל",
    text: "יבשת, מדינה וגילאים. המודעה רצה רק מול מי שצריך לשמוע.",
    image: "/images/step-audience.jpg",
  },
  {
    n: "03",
    title: "קובעים תקציב",
    text: "סכום יומי ומשך. רואים את הסה״כ לפני הסגירה.",
    image: "/images/step-budget.jpg",
  },
  {
    n: "04",
    title: "מעצבים מודעה",
    text: "כותרת, טקסט וכפתור. רואים תצוגה מקדימה לפני שסוגרים.",
    image: "/images/step-ad.jpg",
  },
  {
    n: "05",
    title: "סוגרים ומקבלים אישור",
    text: "אחרי התשלום העיסקה נסגרת, נשלח אישור למייל, והקמפיין רץ בחשבון המטא של הלייבל.",
    image: "/images/step-done.jpg",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-bg">
      <AppHeader />
      <section className="relative min-h-screen overflow-hidden">
        <img
          src="/images/hero.jpg"
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/80 to-bg/30" />
        <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col justify-end px-4 pb-16 pt-28">
          <p className="text-xs font-medium tracking-widest text-fg">Ignite Records</p>
          <h1 className="mt-4 max-w-xl text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
            השיר שלך,
            <br />
            לקהל הנכון.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-fg/80">
            מדביקים קישור ליוטיוב או ספוטיפיי, בוחרים יבשת מדינה וגילאים, קובעים
            תקציב יומי, וסוגרים עיסקה. האישור מגיע למייל, והקמפיין רץ בחשבון המטא
            של הלייבל.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/boost/link">
                איך זה עובד
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/login">כניסת אמנים</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-xs tracking-widest text-muted">התהליך</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">5 צעדים לקראת הקמפיין שלך.</h2>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">
          כל שלב בדף נפרד. בסוף מקבלים מכתב אישור למייל, עם הסכום הקהל והקישור.
        </p>
        <ol className="mt-10 grid gap-5 sm:grid-cols-2">
          {PROCESS.map((step) => (
            <li key={step.n} className="overflow-hidden rounded-xl border border-border bg-surface">
              <img src={step.image} alt="" className="h-44 w-full object-cover" />
              <div className="p-4">
                <p className="text-xs tracking-widest text-subtle">{step.n}</p>
                <h3 className="mt-1 text-lg font-medium">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-20">
        <dl className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface p-5">
            <dt className="text-xs text-muted">פלטפורמות</dt>
            <dd className="mt-1 text-2xl font-semibold">2</dd>
            <p className="mt-2 text-sm leading-relaxed text-muted">יוטיוב וספוטיפיי. שיר או פלייליסט.</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <dt className="text-xs text-muted">תשלום</dt>
            <dd className="mt-1 text-2xl font-semibold">אלינו</dd>
            <p className="mt-2 text-sm leading-relaxed text-muted">האמן משלם ללייבל. אנחנו מפעילים את המודעה.</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <dt className="text-xs text-muted">אישור</dt>
            <dd className="mt-1 text-2xl font-semibold">למייל</dd>
            <p className="mt-2 text-sm leading-relaxed text-muted">אחרי סגירת העיסקה נשלח מכתב עם כל הפרטים.</p>
          </div>
        </dl>
        <div className="mt-10 flex justify-center">
          <Button asChild size="lg">
            <Link to="/boost/link">
              התחל קמפיין
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function Dashboard({ name }: { name: string }) {
  const [rows, setRows] = useState<Campaign[] | null>(null);
  const [studio, setStudio] = useState(false);

  useEffect(() => {
    void listMyCampaigns().then(setRows).catch(() => setRows([]));
    void getBoostSession()
      .then((s) => setStudio(s.isOperator || s.canClaimStudio))
      .catch(() => setStudio(false));
  }, []);

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader studio={studio} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link
          to="/boost/link"
          className="relative block overflow-hidden rounded-xl border border-border"
        >
          <img src="/images/hero.jpg" alt="" className="h-56 w-full object-cover sm:h-64" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5">
            <p className="text-xs tracking-widest text-fg/70">קמפיין חדש</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">שלום {name}</h1>
            <p className="mt-1 text-sm text-fg/80">5 צעדים לקראת הקמפיין שלך.</p>
          </div>
        </Link>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">הקמפיינים שלך</h2>
            <p className="mt-1 text-sm text-muted">תשלום, אישור למייל וביצועים.</p>
          </div>
          <Button asChild>
            <Link to="/boost/link">התחל קמפיין</Link>
          </Button>
        </div>

        {!rows ? (
          <div className="mt-10 flex justify-center text-muted">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-8 overflow-hidden rounded-xl border border-border bg-surface">
            <img src="/images/step-link.jpg" alt="" className="h-40 w-full object-cover" />
            <div className="p-6 text-center">
              <p className="text-muted">עדיין אין קמפיינים. מתחילים מקישור לשיר.</p>
              <Button asChild className="mt-4">
                <Link to="/boost/link">הדבק קישור</Link>
              </Button>
            </div>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {rows.map((c) => (
              <li key={c.id}>
                <Link
                  to="/campaigns/$id"
                  params={{ id: String(c.id) }}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-4 hover:bg-elevated"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{displayText(c.title)}</p>
                    <p className="mt-1 text-xs text-muted">
                      {STATUS_LABEL[c.status] || c.status}, {money(c.totalCents, c.currency)}, {c.days} ימים
                    </p>
                  </div>
                  <span className="text-xs text-subtle">{c.platform}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
