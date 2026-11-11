import { useEffect } from "react";
import {
  Link,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";

export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  useEffect(() => {
    void import("@sentry/tanstackstart-react").then((Sentry) =>
      Sentry.captureException(error),
    );
  }, [error]);
  return (
    <div role="alert" className="safe-area-content">
      <h1 className="text-xl font-semibold">Unable to load this page</h1>
      <p className="my-2 text-muted-foreground">
        Please try again in a moment.
      </p>
      <button
        className="mr-4 underline"
        onClick={() => void router.invalidate().then(reset)}
      >
        Try again
      </button>
      <Link to="/" className="underline">
        Choose an operator
      </Link>
    </div>
  );
}
