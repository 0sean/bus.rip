"use client";

import { LuMapPin, LuClock, LuCoins } from "react-icons/lu";
import * as motion from "motion/react-client";
import {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn, Feature } from "@/lib/utils";
import { FeatureCombobox } from "./ui/combobox";

function AnimatedFeatureBadge({
  step,
  width,
}: {
  step: number;
  width: number;
}) {
  const y = useMemo(() => [0, -32, -64, -96, -96][step], [step]);

  return (
    <motion.div
      className="h-8 overflow-hidden"
      initial={{ width: 105 }}
      animate={{ width }}
    >
      <motion.div className="flex flex-col" animate={{ y }}>
        <FeatureBadge feature="tracking" />
        <FeatureBadge feature="timetables" />
        <FeatureBadge feature="fares" />
        <FeatureBadge feature="tracking" />
      </motion.div>
    </motion.div>
  );
}

function AnimatedFeatureText({ step }: { step: number }) {
  const y = useMemo(() => [0, 0, 0, 0, -28][step], [step]);
  return (
    <motion.div className="h-7 overflow-hidden">
      <motion.div className="flex flex-col" animate={{ y }}>
        <span className="text-zinc-300 text-lg font-semibold h-7">
          that actually works
        </span>
        <span className="text-zinc-300 text-lg font-semibold h-7">
          for any UK bus
        </span>
      </motion.div>
    </motion.div>
  );
}

export function AnimatedFeatures({
  feature,
  setFeature,
}: {
  feature: Feature;
  setFeature: Dispatch<SetStateAction<Feature>>;
}) {
  const [step, setStep] = useState(0),
    [animationFinished, setAnimationFinished] = useState(false),
    width = useMemo(() => [105, 125, 80, 105, 105][step], [step]);

  useEffect(() => {
    if (animationFinished) {
      if (feature === "tracking") {
        setStep(0);
      } else if (feature === "timetables") {
        setStep(1);
      } else if (feature === "fares") {
        setStep(2);
      }
    } else {
      if (step >= 4) {
        setAnimationFinished(true);
        return;
      }

      setTimeout(() => setStep(step + 1), 800);
    }
  }, [step, setStep, feature]);

  return (
    <motion.h2 className="text-zinc-300 text-lg font-semibold flex gap-2 items-center">
      <FeatureCombobox setFeature={setFeature} feature={feature} width={width}>
        <div className="cursor-pointer">
          <AnimatedFeatureBadge step={step} width={width} />
        </div>
      </FeatureCombobox>
      <AnimatedFeatureText step={animationFinished ? 4 : step} />
    </motion.h2>
  );
}

export default function FeatureBadge({ feature }: { feature: Feature }) {
  return (
    <div className="flex gap-2 items-center bg-zinc-800 hover:bg-zinc-700 hover:text-zinc-200 duration-150 transition-colors rounded-md py-1 px-2 text-base w-fit">
      <FeatureBadgeIcon feature={feature} />
      <span className="font-semibold">{`${feature.charAt(0).toUpperCase()}${feature.slice(1)}`}</span>
    </div>
  );
}

export function FeatureBadgeIcon({
  feature,
  className = "",
}: { feature: Feature } & React.ComponentPropsWithoutRef<"svg">) {
  if (feature === "tracking")
    return <LuMapPin className={cn("size-4", className)} />;
  if (feature === "timetables")
    return <LuClock className={cn("size-4", className)} />;
  if (feature === "fares")
    return <LuCoins className={cn("size-4", className)} />;
  return null;
}
