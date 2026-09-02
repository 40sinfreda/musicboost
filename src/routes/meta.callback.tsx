import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { completeOAuthFromCallback } from "@/components/meta-connect";

export const Route = createFileRoute("/meta/callback")({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === "string" ? search.code : "",
    state: typeof search.state === "string" ? search.state : "",
    error: typeof search.error === "string" ? search.error : "",
    error_description:
      typeof search.error_description === "string" ? search.error_description : "",
  }),
  component: MetaCallback,
});

function MetaCallback() {
  const { code, state, error, error_description } = Route.useSearch();
  const navigate = useNavigate();
  const [message, setMessage] = useState("משלים חיבור למטא...");

  useEffect(() => {
    async function run() {
      if (error) {
        setMessage(error_description || error);
        return;
      }
      if (!code || !state) {
        setMessage("חסר קוד הרשאה. אפשר לסגור ולנסות שוב.");
        return;
      }
      try {
        await completeOAuthFromCallback(code, state);
        await navigate({ to: "/studio" });
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "החיבור נכשל");
      }
    }
    void run();
  }, [code, state, error, error_description, navigate]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
      <Loader2 className="size-6 animate-spin text-muted" />
      <p className="max-w-md text-sm leading-relaxed text-muted">{message}</p>
      <a href="/" className="text-sm underline underline-offset-4">
        חזרה לאפליקציה
      </a>
    </main>
  );
}
