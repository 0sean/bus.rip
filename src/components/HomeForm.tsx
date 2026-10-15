import type { NocLine } from "@/db/schema";
import { AnimatedFeatures } from "./FeatureBadge";
import TrackForm from "./TrackForm";
import { useState } from "react";
import type { Feature } from "@/lib/utils";

const EMPTY_LINES: NocLine[] = [];

export default function HomeForm({ lines }: { lines?: NocLine[] }) {
  const [feature, setFeature] = useState<Feature>("tracking");

  return (
    <>
      <div className="mb-4">
        <h1 className="text-zinc-50 text-5xl md:text-6xl font-bold mb-2">
          bus.rip
        </h1>
        <AnimatedFeatures feature={feature} setFeature={setFeature} />
      </div>
      <TrackForm
        lines={lines ?? EMPTY_LINES}
        feature={feature}
        operatorsLoading={lines === undefined}
      />
      {lines === undefined && (
        <span role="status" className="sr-only">
          Loading operators…
        </span>
      )}
    </>
  );
}
