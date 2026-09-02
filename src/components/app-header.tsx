import { Link } from "@tanstack/react-router";
import { Music2 } from "lucide-react";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";

export function AppHeader({
  studio,
}: {
  studio?: boolean;
}) {
  const { user, isPending } = useCurrentUserState();

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-md bg-accent text-accent-fg">
            <Music2 className="size-5" strokeWidth={2} />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight">MusicBoost</p>
            <p className="text-xs text-muted">קידום ממומן ליוטיוב וספוטיפיי</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                to="/boost/link"
                className="inline-flex h-9 items-center rounded-full border border-border px-3 text-xs text-muted"
              >
                קמפיין
              </Link>
              <Link
                to="/inbox"
                className="inline-flex h-9 items-center rounded-full border border-border px-3 text-xs text-muted"
              >
                מייל
              </Link>
              <Link
                to="/studio"
                className={cn(
                  "inline-flex h-9 items-center rounded-full border px-3 text-xs",
                  studio ? "border-accent/40 text-fg" : "border-border text-muted",
                )}
              >
                סטודיו
              </Link>
            </>
          ) : (
            <Link
              to="/boost/link"
              className="inline-flex h-9 items-center rounded-full border border-border px-3 text-xs text-muted"
            >
              התהליך
            </Link>
          )}
          {isPending ? (
            <div className="size-8 animate-pulse rounded-full bg-elevated" />
          ) : user ? (
            <UserButton />
          ) : (
            <Link
              to="/login"
              className="inline-flex h-9 items-center rounded-md bg-accent px-3 text-sm font-medium text-accent-fg"
            >
              כניסה
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function money(cents: number, currency: string) {
  const n = (cents / 100).toLocaleString("he-IL", { maximumFractionDigits: 0 });
  if (currency === "USD") return `$${n}`;
  if (currency === "EUR") return `€${n}`;
  return `₪${n}`;
}

export function displayText(value: string) {
  return value
    .replaceAll(" · ", " ")
    .replaceAll("·", " ")
    .replaceAll("—", ", ")
    .replaceAll("–", " עד ")
    .replaceAll("־", " ")
    .replace(/(\d{4})-(\d{2})-(\d{2})/g, (_, y, m, d) => `${Number(d)}.${Number(m)}.${y}`);
}

export const STATUS_LABEL: Record<string, string> = {
  awaiting_payment: "ממתין לתשלום",
  awaiting_confirmation: "ממתין לאישור תשלום",
  paid: "שולם, מפרסם…",
  live: "פעיל",
  failed: "נכשל בפרסום",
  paused: "מושהה",
};
