import type { NocLine } from "@/db/schema";
import { AnimatedFeatures } from "./FeatureBadge";
import TrackForm from "./TrackForm";
import { useState } from "react";
import type { Feature } from "@/lib/utils";

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
      {lines ? (
        <TrackForm lines={lines} feature={feature} />
      ) : (
        <p role="status" className="text-sm text-zinc-400">
          Loading operators…
        </p>
      )}
    </>
  );
}
