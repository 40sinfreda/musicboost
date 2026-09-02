import { useEffect, useState } from "react";
import { Loader2, LogOut, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { connectMeta } from "@/lib/meta-api";
import { completeOperatorOAuth } from "@/lib/boost-server";
import {
  clearMetaSession,
  loadMetaAppCreds,
  loadMetaSession,
  META_SCOPES,
  metaCallbackUrl,
  saveMetaAppCreds,
  saveMetaSession,
  type MetaSession,
} from "@/lib/meta-session";
import { cn } from "@/lib/utils";

export function useMetaSession() {
  const [session, setSession] = useState<MetaSession | null>(null);

  useEffect(() => {
    setSession(loadMetaSession());
    const onChange = () => setSession(loadMetaSession());
    window.addEventListener("musicboost:meta", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("musicboost:meta", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  return session;
}

export function MetaConnectBar({ onOpen }: { onOpen: () => void }) {
  const session = useMetaSession();
  if (session) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="max-w-[200px] truncate rounded-full border border-border bg-elevated px-3 py-1 text-xs text-fg"
      >
        מטא, {session.userName}
      </button>
    );
  }
  return (
    <Button size="sm" variant="outline" onClick={onOpen}>
      <Unplug className="size-3.5" />
      התחבר למטא
    </Button>
  );
}

export function MetaConnectPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const session = useMetaSession();
  const [token, setToken] = useState("");
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [redirectHint, setRedirectHint] = useState("");

  useEffect(() => {
    const creds = loadMetaAppCreds();
    setAppId(creds.appId);
    setAppSecret(creds.appSecret);
    setRedirectHint(typeof window !== "undefined" ? metaCallbackUrl() : "");
  }, [open]);

  async function applyToken(value: string) {
    setBusy(true);
    setError("");
    try {
      const profile = await connectMeta({ data: { token: value } });
      if (!profile.accounts.length) {
        throw new Error("לא נמצא חשבון מודעות פעיל. ודא הרשאת ads_management.");
      }
      saveMetaSession({
        token: value.trim(),
        userId: profile.userId,
        userName: profile.userName,
        accounts: profile.accounts,
        pages: profile.pages,
        adAccountId: profile.accounts[0].id,
        pageId: profile.pages[0]?.id ?? "",
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "החיבור נכשל");
    } finally {
      setBusy(false);
    }
  }

  function startOAuth() {
    if (!appId.trim()) {
      setError("חסר App ID");
      return;
    }
    saveMetaAppCreds({ appId: appId.trim(), appSecret: appSecret.trim() });
    const redirect = metaCallbackUrl();
    const state = crypto.randomUUID();
    sessionStorage.setItem("musicboost:oauth-state", state);
    const url = new URL("https://www.facebook.com/v26.0/dialog/oauth");
    url.searchParams.set("client_id", appId.trim());
    url.searchParams.set("redirect_uri", redirect);
    url.searchParams.set("state", state);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", META_SCOPES);
    window.location.assign(url.toString());
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-bg/70 p-4 pt-16"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-labelledby="meta-connect-title"
        className="w-full max-w-lg rounded-xl border border-border bg-surface p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="meta-connect-title" className="text-lg font-medium">
              חיבור למטא
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              אחרי חיבור אחד הטוקן נשמר בדפדפן הזה לצמיתות. לא מכניסים אותו לקוד
              ולא לגיטהאב. אחרת כל מי שנכנס יוכל לפרסם על חשבונך.
            </p>
          </div>
          <button
            type="button"
            className="text-sm text-muted hover:text-fg"
            onClick={onClose}
          >
            סגור
          </button>
        </div>

        {session ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm">
              מחובר כ <span className="font-medium">{session.userName}</span>
            </p>
            <div>
              <Label>חשבון מודעות</Label>
              <select
                className="flex h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm text-fg"
                value={session.adAccountId}
                onChange={(e) =>
                  saveMetaSession({ ...session, adAccountId: e.target.value })
                }
              >
                {session.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.accountId}
                    {a.currency ? `, ${a.currency}` : ""})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>דף פייסבוק (המודעה יוצאת ממנו)</Label>
              {session.pages.length ? (
                <select
                  className="flex h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm text-fg"
                  value={session.pageId}
                  onChange={(e) =>
                    saveMetaSession({ ...session, pageId: e.target.value })
                  }
                >
                  {session.pages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-danger">
                  לא נמצא דף. צריך דף שיש לך הרשאת פרסום עליו.
                </p>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => {
                clearMetaSession();
              }}
            >
              <LogOut className="size-4" />
              התנתק
            </Button>
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            <div>
              <Label>Access Token</Label>
              <Input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="EAAB..."
                autoComplete="off"
              />
              <p className="mt-2 text-xs leading-relaxed text-muted">
                ב{" "}
                <a
                  className="underline underline-offset-2"
                  href="https://developers.facebook.com/tools/explorer"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Graph API Explorer
                </a>
                {" "}בחר את האפליקציה שלך, הוסף הרשאות ads_management, ads_read,
                pages_show_list, business_management, ולחץ Generate Access Token.
              </p>
              <Button
                className="mt-3 w-full"
                disabled={busy || token.trim().length < 10}
                onClick={() => void applyToken(token)}
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : "חבר טוקן"}
              </Button>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-sm font-medium">או Login עם אפליקציית מטא שלך</p>
              <Label className="mt-3">App ID</Label>
              <Input
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="1234567890"
              />
              <Label className="mt-3">App Secret</Label>
              <Input
                type="password"
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
                placeholder="משמש רק להחלפת קוד, נשמר בדפדפן"
                autoComplete="off"
              />
              {redirectHint && (
                <p className={cn("mt-2 text-xs leading-relaxed text-muted")}>
                  ב Valid OAuth Redirect URIs של האפליקציה הוסף:
                  <br />
                  <code className="break-all text-fg">{redirectHint}</code>
                </p>
              )}
              <Button
                variant="outline"
                className="mt-3 w-full"
                onClick={startOAuth}
                disabled={busy}
              >
                התחבר עם פייסבוק
              </Button>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-md border border-danger/30 bg-elevated px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export async function completeOAuthFromCallback(code: string, state: string) {
  const expected = sessionStorage.getItem("musicboost:oauth-state");
  if (!expected || expected !== state) {
    throw new Error("מצב OAuth לא תקין. נסה להתחבר שוב.");
  }
  const creds = loadMetaAppCreds();
  if (!creds.appId || !creds.appSecret) {
    throw new Error("חסר App ID או App Secret בדפדפן. חזור למסך החיבור.");
  }
  await completeOperatorOAuth({
    data: {
      appId: creds.appId,
      appSecret: creds.appSecret,
      code,
      redirectUri: metaCallbackUrl(),
    },
  });
  sessionStorage.removeItem("musicboost:oauth-state");
}
