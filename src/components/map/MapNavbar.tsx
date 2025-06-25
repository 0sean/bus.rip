import { Menubar, MenubarMenu, MenubarTrigger } from "@/components/ui/menubar";
import { FaArrowLeft } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { useStopwatch } from "react-timer-hook";
import { Progress } from "@/components/ui/progress";
import {
  Dispatch,
  memo,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AnimatePresence } from "motion/react";
import * as motion from "motion/react-client";
import { LuEllipsis } from "react-icons/lu";

import type { DatafeedRouteResponse } from "@/lib/bods";
import { cn } from "@/lib/utils";

function MapNavbar({
  data,
  isLoading,
}: {
  data: DatafeedRouteResponse | null;
  isLoading: boolean;
}) {
  const router = useRouter();

  return (
    <div className="fixed top-0 left-0 p-2 w-screen flex flex-col items-center gap-2 z-10">
      <Menubar className="w-full md:w-fit drop-shadow-2xl">
        <MenubarMenu>
          <MenubarTrigger
            className="hover:bg-zinc-800 transition-colors"
            onClick={() => {
              router.push("/");
            }}
          >
            <FaArrowLeft />
          </MenubarTrigger>
          <h1 className="text-sm grow text-center font-semibold md:px-36">
            {data != undefined &&
              data.line != undefined &&
              !isLoading &&
              data.line.publicName}
          </h1>
          <MapNavbarProgress />
        </MenubarMenu>
      </Menubar>
      <MapNavbarTabs />
    </div>
  );
}

export default memo(MapNavbar);

function MapNavbarTabs() {
  const [tab, setTab] = useState("tracking"),
    [shown, setShown] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setShown(false);
    }, 5000);
  }, []);

  return (
    <motion.div
      layout
      animate={{
        width: shown ? 384 : 38,
        height: shown ? 45 : 22,
        padding: shown ? 4 : 0,
      }}
      initial={{ width: 384, height: 45, padding: 4 }}
      className="max-w-full flex bg-zinc-900 rounded-full border-3 border-zinc-600/50 drop-shadow-2xl shadow-lg justify-center"
      onMouseEnter={() => setShown(true)}
      onMouseLeave={() => setTimeout(() => setShown(false), 5000)}
    >
      <AnimatePresence mode="wait" initial={false}>
        {shown ? (
          <motion.div
            key="tabs"
            initial={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="flex gap-2 w-96"
          >
            <MapNavbarTab name="Tracking" tab={tab} setTab={setTab} />
            <MapNavbarTab name="Timetables" tab={tab} setTab={setTab} />
            <MapNavbarTab name="Fares" tab={tab} setTab={setTab} />
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
  setTab,
}: {
  name: string;
  tab: string;
  setTab: Dispatch<SetStateAction<string>>;
}) {
  const selected = useMemo(() => tab === name.toLowerCase(), [tab, name]),
    classes = useMemo(
      () =>
        selected ? "bg-zinc-800 text-zinc-100" : "bg-zinc-800/50 text-zinc-400",
      [selected],
    );

  return (
    <div
      className={cn(
        "grow w-full flex justify-center items-center font-medium rounded-full p-2 text-xs transition-colors hover:bg-zinc-800 hover:text-zinc-100 cursor-pointer",
        classes,
      )}
    >
      <span>{name}</span>
    </div>
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
      <Progress value={totalSeconds * 10} style={{ width: 14, height: 14 }} />
    </div>
  );
}
