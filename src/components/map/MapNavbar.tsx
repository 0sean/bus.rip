import { Menubar, MenubarMenu, MenubarTrigger } from "@/components/ui/menubar";
import { FaArrowLeft } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { useStopwatch } from "react-timer-hook";
import { Progress } from "@/components/ui/progress";
import { memo, useEffect } from "react";

import type { DatafeedRouteResponse } from "@/lib/bods";

function MapNavbar({
  data,
  isLoading,
}: {
  data: DatafeedRouteResponse | null;
  isLoading: boolean;
}) {
  const router = useRouter();

  return (
    <div className="fixed top-0 left-0 p-2 w-screen flex justify-center z-10">
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
          <h1 className="text-sm grow text-center font-semibold md:px-32">
            {data != undefined &&
              data.line != undefined &&
              !isLoading &&
              data.line.publicName}
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
      <Progress value={totalSeconds * 10} style={{ width: 14, height: 14 }} />
    </div>
  );
}
