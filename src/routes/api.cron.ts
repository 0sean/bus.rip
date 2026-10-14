import { createFileRoute } from "@tanstack/react-router";
import { refreshOperators } from "@/functions/operators";
export const Route = createFileRoute("/api/cron")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = process.env.CRON_TOKEN || process.env.CRON_SECRET;
        if (
          !token ||
          request.headers.get("Authorization") !== `Bearer ${token}`
        )
          return Response.json({ error: "Invalid token" }, { status: 401 });
        return Response.json(await refreshOperators());
      },
    },
  },
});
