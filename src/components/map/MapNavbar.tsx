import { Menubar, MenubarMenu, MenubarTrigger } from "@/components/ui/menubar";
import { FaArrowLeft } from "react-icons/fa";
import { useLocation, useNavigate, Link } from "@tanstack/react-router";
import { useStopwatch } from "react-timer-hook";
import { Progress } from "@/components/ui/progress";
import { memo, useEffect, useMemo, useState, useRef } from "react";
import { AnimatePresence } from "motion/react";
import * as motion from "motion/react-client";
import { LuEllipsis } from "react-icons/lu";

import type { DatafeedRouteResponse } from "@/lib/bods";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

function MapNavbar({
  data,
  isLoading,
  nearby = false,
}: {
  data: DatafeedRouteResponse | null;
  isLoading: boolean;
  nearby?: boolean;
}) {
  const navigate = useNavigate();

  return (
    <div className="fixed top-0 left-0 p-2 w-screen flex flex-col items-center gap-2 z-60">
      <Menubar className="w-full md:w-128 drop-shadow-2xl">
        <MenubarMenu>
          <MenubarTrigger
            className="hover:bg-zinc-800 transition-colors"
            onClick={() => {
              void navigate({ to: "/" });
            }}
          >
            <FaArrowLeft />
          </MenubarTrigger>
          <h1 className="text-sm grow text-center font-semibold">
            {nearby ? "Nearby" : !isLoading && data?.line?.publicName}
          </h1>
          <MapNavbarProgress />
        </MenubarMenu>
      </Menubar>
      {!nearby && <MapNavbarTabs noc={data?.line?.nocCode} />}
    </div>
  );
}

export default memo(MapNavbar);

function MapNavbarTabs({ noc }: { noc?: string }) {
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [shown, setShown] = useState(true),
    pathname = useLocation({ select: (location) => location.pathname }),
    tab = useMemo(
      () => pathname.split("/").slice(2, 3)[0] || "tracking",
      [pathname],
    ),
    isShown = useMemo(() => shown || tab != "tracking", [shown, tab]);

  useEffect(() => {
    hideTimer.current = setTimeout(() => setShown(false), 5000);
    return () => clearTimeout(hideTimer.current);
  }, []);

  return (
    <motion.div
      layout
      animate={{
        width: isShown ? 384 : 38,
        height: isShown ? 45 : 22,
        padding: isShown ? 4 : 0,
      }}
      initial={{ width: 384, height: 45, padding: 4 }}
      className="max-w-full flex bg-zinc-900 rounded-full border-3 border-zinc-600/50 drop-shadow-2xl shadow-lg justify-center"
      onMouseEnter={() => {
        clearTimeout(hideTimer.current);
        setShown(true);
      }}
      onMouseLeave={() => {
        clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setShown(false), 5000);
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isShown ? (
          <motion.div
            key="tabs"
            initial={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="flex gap-2 w-96"
          >
            <MapNavbarTab name="Tracking" tab={tab} noc={noc} />
            <MapNavbarTab name="Timetables" tab={tab} noc={noc} />
            <MapDisabledNavbarTab name="Fares" tab={tab} />
          </motion.div>
        ) : (
          <MapNavbarTabsHint key="hint" />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MapNavbarTab({
  name,
  tab,
  noc,
}: {
  name: string;
  tab: string;
  noc?: string;
}) {
  const selected = useMemo(() => tab === name.toLowerCase(), [tab, name]),
    classes = useMemo(
      () =>
        selected ? "bg-zinc-800 text-zinc-100" : "bg-zinc-800/50 text-zinc-400",
      [selected],
    );

  return (
    <Link
      to={name === "Tracking" ? "/$nocCode" : "/$nocCode/timetables"}
      params={{ nocCode: noc || "" }}
      state={{ mapView: true }}
      search={{}}
      disabled={!noc}
      className={cn(
        "grow w-full flex justify-center items-center font-medium rounded-full p-2 text-xs transition-colors hover:bg-zinc-800 hover:text-zinc-100",
        classes,
      )}
    >
      <span>{name}</span>
    </Link>
  );
}

function MapDisabledNavbarTab({ name, tab }: { name: string; tab: string }) {
  const selected = useMemo(() => tab === name.toLowerCase(), [tab, name]),
    classes = useMemo(
      () =>
        selected ? "bg-zinc-800 text-zinc-100" : "bg-zinc-800/50 text-zinc-400",
      [selected],
    );

  return (
    <Tooltip>
      <TooltipTrigger
        render={<div />}
        aria-disabled={true}
        className={cn(
          "grow w-full flex justify-center items-center font-medium rounded-full p-2 text-xs transition-colors hover:bg-zinc-800 hover:text-zinc-100 cursor-not-allowed",
          classes,
        )}
      >
        <span>{name}</span>
      </TooltipTrigger>
      <TooltipContent className="!z-100 shadow-md" side="bottom">
        <p>Coming soon</p>
      </TooltipContent>
    </Tooltip>
  );
}

function MapNavbarTabsHint() {
  return (
    <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <LuEllipsis size={18} />
    </motion.div>
  );
}

function MapNavbarProgress() {
  const { totalSeconds, reset } = useStopwatch({ autoStart: true });

  useEffect(() => {
    function resetOnEvent() {
      reset();
    }
    document.addEventListener("map:reset-timer", resetOnEvent);
    return () => document.removeEventListener("map:reset-timer", resetOnEvent);
  }, [reset]);

  return (
    <div className="px-3 py-1.5">
      <Progress
        value={totalSeconds * 10}
        style={{ width: 14, height: 14 }}
        className="[&_[data-slot=progress-track]]:h-full"
        aria-label="Time until the next map refresh"
      />
    </div>
  );
}
