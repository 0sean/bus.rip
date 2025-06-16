import { Marker, useMap } from "@vis.gl/react-maplibre";
import { useMemo, useState } from "react";
import type { CSSProperties, Dispatch, SetStateAction } from "react";

import { Vehicle, Validity } from "@/lib/bods";
import VehiclePopup from "./VehiclePopup";

export default function VehicleMarker({ vehicle, mapBearing, popupOpen, togglePopup, setFollowing, following }: { vehicle: Vehicle, mapBearing: number, popupOpen: boolean, togglePopup: () => void, setFollowing: Dispatch<SetStateAction<string | null>>, following: boolean }) {
    const bearing = useMemo(() => Number(vehicle.bearing), [vehicle.bearing]);

    return <>
        <Marker 
            rotation={Number.isNaN(bearing) ? undefined : bearing}
            rotationAlignment="map"
            longitude={Number(vehicle.longitude)}
            latitude={Number(vehicle.latitude)}
            anchor="top"
            onClick={togglePopup}
        >
            <VehicleMarkerDot vehicle={vehicle} mapBearing={mapBearing} />
        </Marker>
        {popupOpen && <VehiclePopup vehicle={vehicle} togglePopup={togglePopup} setFollowing={setFollowing} following={following} />}
    </>;
}

// TODO: Improve box shadow
function VehicleMarkerDot({
  vehicle,
  mapBearing,
}: {
  vehicle: Vehicle;
  mapBearing: number;
}) {
  const style = {
      "--rotation": `${mapBearing - (vehicle.bearing || 0)}deg`,
    } as CSSProperties,
    validityClass = useMemo(() => {
      if (vehicle.validity === Validity.Expiring1) return " opacity-75";
      if (vehicle.validity === Validity.Expiring2) return " opacity-50";
      return "";
    }, [vehicle.validity]);

  return (
    <div
      className={`size-[28px] bg-background rounded-full border shadow-xl flex justify-center items-center${validityClass}`}
    >
      <span
        className={`font-bold ${vehicle.lineName.length > 2 ? "text-[10px]" : "text-xs"} rotate-(--rotation)`}
        style={style}
      >
        {vehicle.lineName}
      </span>
      {vehicle.bearing && <VehicleMarkerArrow />}
    </div>
  );
}

function VehicleMarkerArrow() {
  return (
    <div className="w-[28px] h-[42px] absolute top-[-14px] left-0">
      <div
        className="size-[12px] bg-no-repeat bg-bottom mx-auto"
        style={{ backgroundImage: "url('/arrow.svg')" }}
      ></div>
    </div>
  );
}
