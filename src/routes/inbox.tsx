import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Mail } from "lucide-react";
import { AppHeader, displayText } from "@/components/app-header";
import { EmailLetter } from "@/components/boost-ui";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listMyEmails, type PublicEmail } from "@/lib/boost-server";

export const Route = createFileRoute("/inbox")({ component: InboxPage });

function InboxPage() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <div className="min-h-screen bg-bg" />;
  if (!user) return <RedirectToSignIn />;
  return <Inbox />;
}

function Inbox() {
  const [rows, setRows] = useState<PublicEmail[] | null>(null);

  useEffect(() => {
    void listMyEmails()
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-semibold tracking-tight">אישורים במייל</h1>
        <p className="mt-2 text-sm text-muted">כל מכתב שנשלח אחרי סגירת עיסקה.</p>
        {!rows ? (
          <div className="mt-10 flex justify-center text-muted">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-10 rounded-xl border border-border bg-surface p-8 text-center text-muted">
            <Mail className="mx-auto size-6" />
            <p className="mt-3">עדיין אין אישורים. אחרי סגירת קמפיין הם יופיעו כאן.</p>
          </div>
        ) : (
          <ul className="mt-8 space-y-5">
            {rows.map((mail) => (
              <li key={mail.id}>
                <EmailLetter to={mail.toEmail} subject={displayText(mail.subject)} preview={displayText(mail.preview)} />
                <Link
                  to="/campaigns/$id"
                  params={{ id: String(mail.campaignId) }}
                  className="mt-2 inline-block text-xs text-muted"
                >
                  לקמפיין
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
