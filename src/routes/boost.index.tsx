import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/boost/")({
  beforeLoad: () => {
    throw redirect({ to: "/boost/link" });
  },
  component: () => null,
});
