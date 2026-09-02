import { useEffect } from "react";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/app-header";
import { BoostStepper } from "@/components/boost-ui";
import { rehydrateBoostDraft } from "@/lib/boost-draft";

export const Route = createFileRoute("/boost")({ component: BoostLayout });

function BoostLayout() {
  useEffect(() => {
    rehydrateBoostDraft();
  }, []);

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader />
      <BoostStepper />
      <div className="page-in mx-auto max-w-3xl px-4 py-8 pb-24">
        <Outlet />
      </div>
    </div>
  );
}
