import { memo } from "react";
import { Marker } from "react-map-gl/maplibre";

function LocationMarker({ location }: { location: [number, number] }) {
  return (
    <Marker longitude={location[0]} latitude={location[1]} anchor="center">
      <div className="size-4 bg-zinc-900 border-zinc-600/50 border-2 rounded-full flex justify-center items-center">
        <div className="size-1 bg-zinc-100 rounded-full"></div>
      </div>
    </Marker>
  );
}

export default memo(LocationMarker);
