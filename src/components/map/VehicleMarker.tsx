import { Marker, useMap } from "react-map-gl/maplibre";
import { useMemo, useState, memo, useCallback } from "react";
import type { CSSProperties, Dispatch, SetStateAction } from "react";

import { Vehicle, Validity } from "@/lib/bods";
import VehiclePopup from "./VehiclePopup";

function VehicleMarker({ vehicle, popupOpen, togglePopup, setFollowing, following }: { vehicle: Vehicle, popupOpen: boolean, togglePopup: (vehicleref: string) => void, setFollowing: Dispatch<SetStateAction<string | null>>, following: boolean }) {
    const bearing = useMemo(() => Number(vehicle.bearing), [vehicle.bearing]),
      toggle = useCallback(() => togglePopup(vehicle.ref), [vehicle.ref, togglePopup]);

    return <>
        <Marker 
            rotation={Number.isNaN(bearing) ? undefined : bearing}
            rotationAlignment="map"
            longitude={Number(vehicle.longitude)}
            latitude={Number(vehicle.latitude)}
            anchor="top"
            onClick={toggle}
        >
            <VehicleMarkerDot vehicle={vehicle} />
        </Marker>
        {popupOpen && <VehiclePopup vehicle={vehicle} togglePopup={toggle} setFollowing={setFollowing} following={following} />}
    </>;
}

export default memo(VehicleMarker);

// TODO: Improve box shadow
function VehicleMarkerDot({
  vehicle
}: {
  vehicle: Vehicle;
}) {
  const style = {
      "--rotation": `calc(var(--map-rotation) - ${(vehicle.bearing || 0)}deg)`,
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
      {vehicle.bearing != null && <MemoizedVehicleMarkerArrow />}
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

const MemoizedVehicleMarkerArrow = memo(VehicleMarkerArrow);