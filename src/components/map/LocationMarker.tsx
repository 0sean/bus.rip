import { memo } from "react";
import { Marker } from "react-map-gl/maplibre";

function LocationMarker({ location }: { location: [number, number] }) {
  return (
    <Marker longitude={location[0]} latitude={location[1]} anchor="center">
      <div className="size-4 bg-background border-border border-2 rounded-full flex justify-center items-center">
        <div className="size-1 bg-primary rounded-full"></div>
      </div>
    </Marker>
  );
}

export default memo(LocationMarker);
