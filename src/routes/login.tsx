import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Music2 } from "lucide-react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginSearch = { redirect?: string };

function safeRedirect(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: safeRedirect(search.redirect),
  }),
  component: Login,
});

function Login() {
  const { redirect } = Route.useSearch();
  const next = redirect || "/";
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "up") {
        const res = await authClient.signUp.email({ email, password, name: name || email.split("@")[0] });
        if (res.error) throw new Error(res.error.message || "הרשמה נכשלה");
      } else {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message || "הכניסה נכשלה");
      }
      window.location.href = next;
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-bg lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <img src="/images/hero.jpg" alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10">
          <p className="text-xs tracking-widest">Ignite Records</p>
          <p className="mt-2 max-w-sm text-2xl font-semibold leading-snug">
            אחרי הכניסה ממשיכים בדיוק מאיפה שהפסקת.
          </p>
        </div>
      </div>
      <div className="grid place-items-center p-6">
        <div className="w-full max-w-sm space-y-5 rounded-xl border border-border bg-surface p-6">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-md bg-accent text-accent-fg">
              <Music2 className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">MusicBoost</p>
              <p className="text-xs text-muted">כניסת אמנים ולייבל</p>
            </div>
          </Link>
          <h1 className="text-xl font-semibold">{mode === "in" ? "כניסה" : "הרשמה"}</h1>
          {authEnabled ? (
            <>
              <div className="space-y-2">
                {GROK_PROVIDERS.map((p) => (
                  <Button
                    key={p.providerId}
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => signIn(p.providerId, { callbackURL: next })}
                  >
                    המשך עם {p.label}
                  </Button>
                ))}
              </div>
              <p className="text-center text-xs text-subtle">או עם אימייל</p>
              <form className="space-y-3" onSubmit={(e) => void onEmail(e)}>
                {mode === "up" ? (
                  <div>
                    <Label>שם</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="שם האמן / הלייבל" />
                  </div>
                ) : null}
                <div>
                  <Label>אימייל</Label>
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label>סיסמה</Label>
                  <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                {error ? <p className="text-sm text-danger">{error}</p> : null}
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : mode === "in" ? "כניסה" : "יצירת חשבון"}
                </Button>
              </form>
              <button
                type="button"
                className="w-full text-sm text-muted"
                onClick={() => setMode(mode === "in" ? "up" : "in")}
              >
                {mode === "in" ? "אין חשבון? הרשמה" : "יש חשבון? כניסה"}
              </button>
            </>
          ) : (
            <p className="text-sm text-muted">הכניסה כבויה כרגע.</p>
          )}
        </div>
      </div>
    </main>
  );
}
