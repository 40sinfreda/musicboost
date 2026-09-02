import { Link, useRouterState } from "@tanstack/react-router";
import { Music2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  categoryLabel,
  formatPlays,
  sourceLabel,
  type MediaMeta,
} from "@/lib/parser";

export function Chip({
  on,
  children,
  onClick,
}: {
  on: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-11 rounded-full border px-4 text-sm transition-colors duration-150",
        on
          ? "border-accent bg-elevated text-fg"
          : "border-border bg-transparent text-muted hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

export function AdMock({
  title,
  body,
  thumbnail,
  cta,
  domain,
}: {
  title: string;
  body: string;
  thumbnail?: string;
  cta: string;
  domain: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-elevated p-3">
      <p className="text-xs text-subtle">תצוגת מודעה</p>
      {thumbnail ? (
        <img src={thumbnail} alt="" className="mt-3 h-40 w-full rounded-md object-cover" />
      ) : (
        <div className="mt-3 grid h-40 place-items-center rounded-md bg-surface text-subtle">
          <Music2 className="size-8" />
        </div>
      )}
      <p className="mt-3 text-sm font-medium">{title || "כותרת המודעה"}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted">{body || "טקסט המודעה"}</p>
      <p className="mt-2 text-xs text-subtle">{domain}</p>
      <div className="mt-3 inline-flex h-8 items-center rounded-full bg-accent px-3 text-xs font-medium text-accent-fg">
        {cta}
      </div>
    </div>
  );
}

export const BOOST_STEPS = [
  { path: "/boost/link", label: "קישור", short: "1" },
  { path: "/boost/audience", label: "קהל", short: "2" },
  { path: "/boost/budget", label: "תקציב", short: "3" },
  { path: "/boost/ad", label: "מודעה", short: "4" },
  { path: "/boost/pay", label: "סגירה", short: "5" },
] as const;

export function stepIndex(pathname: string) {
  if (pathname === "/boost" || pathname === "/boost/") return -1;
  const i = BOOST_STEPS.findIndex((s) => pathname.startsWith(s.path));
  return i < 0 ? -1 : i;
}

export function BoostStepper() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = stepIndex(pathname);
  const percent = current < 0 ? 0 : ((current + 1) / BOOST_STEPS.length) * 100;

  return (
    <div className="border-b border-border bg-bg">
      <div className="mx-auto max-w-3xl px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {current < 0 ? (
              "5 צעדים לקראת הקמפיין שלך"
            ) : (
              <>
                שלב {current + 1} מתוך {BOOST_STEPS.length}
                <span className="text-fg"> {BOOST_STEPS[current]?.label}</span>
              </>
            )}
          </p>
          {current >= 0 ? (
            <p className="hidden text-xs text-subtle sm:block">5 צעדים לקראת הקמפיין שלך</p>
          ) : null}
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-elevated">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
        <ol className="mt-4 hidden grid-cols-5 gap-2 md:grid">
          {BOOST_STEPS.map((step, i) => (
            <li key={step.path}>
              <Link
                to={step.path}
                className={cn(
                  "flex h-9 items-center justify-center rounded-full border text-xs transition-colors duration-150",
                  i <= current
                    ? "border-accent/40 bg-surface text-fg"
                    : "border-border text-subtle",
                )}
              >
                {step.label}
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export function MediaCard({ media }: { media: MediaMeta }) {
  const isSong = media.contentType === "track";
  const plays = typeof media.plays === "number" ? formatPlays(media.plays) : "";
  const tracks = typeof media.trackCount === "number" ? String(media.trackCount) : "";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      {media.thumbnail ? (
        <img src={media.thumbnail} alt="" className="h-56 w-full object-cover sm:h-64" />
      ) : (
        <div className="grid h-56 place-items-center bg-elevated text-subtle sm:h-64">
          <Music2 className="size-10" />
        </div>
      )}
      <div className="p-5">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Spec label="קטגוריה" value={categoryLabel(media.contentType)} />
          <Spec
            label="מקור"
            value={sourceLabel(media.platform)}
            tone={media.platform === "youtube" ? "text-yt" : "text-sp"}
          />
          {plays ? <Spec label="השמעות" value={plays} /> : null}
          {tracks ? <Spec label="שירים" value={tracks} /> : null}
        </dl>
        <div className="mt-5 border-t border-border pt-5">
          <p className="text-xs text-muted">{isSong ? "שם השיר" : "שם הפלייליסט"}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">{media.title}</h2>
          {media.author ? (
            <>
              <p className="mt-4 text-xs text-muted">{isSong ? "שם האומן" : "יוצר"}</p>
              <p className="mt-1 text-lg font-medium">{media.author}</p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Spec({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-elevated px-3 py-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={cn("mt-1 text-sm font-medium", tone)}>{value}</dd>
    </div>
  );
}

export function EmailLetter({
  to,
  subject,
  preview,
}: {
  to: string;
  subject: string;
  preview: string;
}) {
  return (
    <article className="overflow-hidden rounded-xl border border-border bg-fg text-bg">
      <header className="border-b border-bg/10 px-5 py-4">
        <p className="text-xs tracking-widest text-bg/60">MUSICBOOST</p>
        <h3 className="mt-1 text-lg font-semibold">{subject}</h3>
        <p className="mt-1 text-sm text-bg/70">אל {to}</p>
      </header>
      <div className="px-5 py-5 text-sm leading-relaxed text-bg/80">{preview}</div>
    </article>
  );
}
