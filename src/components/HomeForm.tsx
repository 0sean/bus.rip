"use client";

import type { getNocLines } from "@/utils/getNocLines";
import { AnimatedFeatures } from "./FeatureBadge";
import TrackForm from "./TrackForm";
import { useState } from "react";
import type { Feature } from "@/lib/utils";

export default function HomeForm({
  lines,
}: {
  lines: Awaited<ReturnType<typeof getNocLines>>;
}) {
  const [feature, setFeature] = useState<Feature>("tracking");

  return (
    <>
      <div className="mb-4">
        <h1 className="text-zinc-50 text-6xl font-bold mb-2">bus.rip</h1>
        <AnimatedFeatures feature={feature} setFeature={setFeature} />
      </div>
      <TrackForm lines={lines} />
    </>
  );
}
