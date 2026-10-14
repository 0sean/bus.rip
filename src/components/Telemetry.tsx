import { lazy, Suspense, useEffect, useState } from "react";
const Analytics = lazy(() =>
  import("@vercel/analytics/react").then((module) => ({
    default: module.Analytics,
  })),
);
const SpeedInsights = lazy(() =>
  import("@vercel/speed-insights/react").then((module) => ({
    default: module.SpeedInsights,
  })),
);
export function Telemetry() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted ? (
    <Suspense fallback={null}>
      <Analytics />
      <SpeedInsights />
    </Suspense>
  ) : null;
}
