import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/especies")({
  beforeLoad: () => {
    throw redirect({ to: "/mapa", replace: true });
  },
});
