import { Popup } from "react-map-gl/maplibre";
import { FaArrowRight, FaArrowUpFromBracket } from "react-icons/fa6";
import { formatDistanceToNow } from "date-fns";
import { useMemo } from "react";

import type { Vehicle } from "@/lib/bods";
import { renderTime } from "@/lib/map";
import type { Dispatch, SetStateAction } from "react";

export default function VehiclePopup({
  vehicle,
  togglePopup,
  setFollowing,
  following,
}: {
  vehicle: Vehicle;
  togglePopup: () => void;
  setFollowing: Dispatch<SetStateAction<string | null>>;
  following: boolean;
}) {
  const departureTime = useMemo(
      () => renderTime(vehicle.departureTime),
      [vehicle.departureTime],
    ),
    arrivalTime = useMemo(
      () => renderTime(vehicle.arrivalTime),
      [vehicle.arrivalTime],
    );

  return (
    <Popup
      longitude={Number(vehicle.longitude)}
      latitude={Number(vehicle.latitude)}
      closeOnClick={false} // This must be false or the popup doesn't show for some reason..
      onClose={togglePopup}
      className="pb-2"
    >
      <div className="flex w-full">
        <div className="w-2/5">
          <p className={"font-semibold text-2xl mb-1.5"}>{departureTime}</p>
          <p className="leading-tight">{vehicle.originName}</p>
        </div>
        <div className="w-1/5 flex justify-center items-center">
          <FaArrowRight />
        </div>
        <div className="w-2/5 text-end">
          <p className="font-semibold text-2xl mb-1.5">{arrivalTime}</p>
          <p className="leading-tight">{vehicle.destinationName}</p>
        </div>
      </div>
      <p className="mt-2 opacity-50 text-[11px]">
        Updated{" "}
        {formatDistanceToNow(vehicle.recordedAt, {
          addSuffix: true,
          includeSeconds: true,
        })}
      </p>
      <div className="flex gap-2 w-full">
        <button
          onClick={() =>
            following ? setFollowing(null) : setFollowing(vehicle.ref)
          }
          className="grow p-1.5 outline-0 rounded-sm mt-2 border"
        >
          {following ? "Following" : "Follow"}
        </button>
        <button
          onClick={() => {
            const url = `${window.location.href}?vehicleId=${vehicle.ref}`;
            try {
              navigator.share({ url });
            } catch (e) {
              navigator.clipboard.writeText(url);
            }
          }}
          className="grow-0 w-[32px] p-2 rounded-sm mt-2 border"
        >
          <FaArrowUpFromBracket />
        </button>
      </div>
    </Popup>
  );
}
