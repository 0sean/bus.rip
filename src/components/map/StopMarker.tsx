import type { Stop } from "@/lib/buslane";
import { memo } from "react";
import { TbBusStop } from "react-icons/tb";
import { Marker } from "react-map-gl/maplibre";
import StopPopup from "./StopPopup";

function StopMarker({
  stop,
  noc,
  popupOpen,
  togglePopup,
}: {
  stop: Stop;
  noc: string;
  popupOpen: boolean;
  togglePopup: () => void;
}) {
  return (
    <>
      <Marker
        longitude={Number(stop.lon)}
        latitude={Number(stop.lat)}
        anchor="top"
        onClick={togglePopup}
      >
        <div className="size-6 bg-background/50 backdrop-blur-sm border border-border rounded-full flex justify-center items-center shadow-md">
          <TbBusStop className="text-foreground text-base" />
        </div>
      </Marker>
      {popupOpen && (
        <StopPopup stop={stop} togglePopup={togglePopup} noc={noc} />
      )}
    </>
  );
}

export default memo(StopMarker);
