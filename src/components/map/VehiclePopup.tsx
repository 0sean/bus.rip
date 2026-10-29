import { Popup } from "react-map-gl/maplibre";
import { FaArrowRight, FaArrowUpFromBracket } from "react-icons/fa6";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useMemo, useState } from "react";

import type { Vehicle } from "@/lib/bods";
import { renderTime } from "@/lib/map";
import type { Dispatch, SetStateAction } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import {
  IconArrowRight,
  IconClock,
  IconHourglass,
  IconShare,
} from "@tabler/icons-react";

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
    ),
    [distanceToNow, setDistanceToNow] = useState("");

  useEffect(() => {
    function updateDistance() {
      setDistanceToNow(
        formatDistanceToNow(vehicle.recordedAt, {
          addSuffix: true,
          includeSeconds: true,
        }),
      );
    }

    updateDistance();
    const interval = setInterval(updateDistance, 1000);
    return () => clearInterval(interval);
  }, [vehicle.recordedAt]);

  return (
    <Popup
      longitude={Number(vehicle.longitude)}
      latitude={Number(vehicle.latitude)}
      closeOnClick={false} // This must be false or the popup doesn't show for some reason..
      onClose={togglePopup}
      className="pb-2"
      closeButton={false}
    >
      <Card className="w-xs !font-sans gap-0">
        <CardHeader className="border-b">
          <div className="flex justify-between items-center">
            <p className="font-medium text-2xl">{departureTime}</p>
            <IconArrowRight size={16} />
            <p className="font-medium text-2xl">{arrivalTime}</p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground text-xs">
              {vehicle.originName}
            </p>
            <p className="text-muted-foreground text-xs">
              {vehicle.destinationName}
            </p>
          </div>
        </CardHeader>
        <CardContent className="flex justify-between py-3">
          {/* TODO: Lateness */}
          <p className="text-muted-foreground text-xs flex gap-1">
            <IconHourglass size={16} /> Running on time
          </p>
          <p className="text-muted-foreground text-xs flex gap-1">
            <IconClock size={16} /> {distanceToNow}
          </p>
        </CardContent>
        <CardFooter className="gap-2">
          {/* TODO: Share button operator? */}
          <Button
            className="grow"
            onClick={() =>
              following ? setFollowing(null) : setFollowing(vehicle.ref)
            }
          >
            {following ? "Following" : "Follow"}
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              const shareUrl = new URL(window.location.href);
              shareUrl.searchParams.set("vehicleId", vehicle.ref);
              const url = shareUrl.toString();
              try {
                if (navigator.share) await navigator.share({ url });
                else await navigator.clipboard.writeText(url);
              } catch {
                await navigator.clipboard.writeText(url);
              }
            }}
          >
            <IconShare size={16} />
          </Button>
        </CardFooter>
      </Card>
    </Popup>
  );
}
