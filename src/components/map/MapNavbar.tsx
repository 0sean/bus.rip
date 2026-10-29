import { Menubar, MenubarMenu, MenubarTrigger } from "@/components/ui/menubar";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "@tanstack/react-router";
import { useStopwatch } from "react-timer-hook";
import { Progress } from "@/components/ui/progress";
import { memo, useEffect } from "react";

import type { DatafeedRouteResponse } from "@/lib/bods";

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
    <div className="map-header fixed top-0 inset-x-0 flex flex-col items-center gap-2 z-60">
      <Menubar className="w-full md:w-128">
        <MenubarMenu>
          <MenubarTrigger
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
    </div>
  );
}

export default memo(MapNavbar);

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
