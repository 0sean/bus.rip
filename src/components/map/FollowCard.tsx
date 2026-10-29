import { Vehicle } from "@/lib/bods";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@base-ui/react";
import {
  IconArrowRight,
  IconHourglass,
  IconClock,
  IconShare,
} from "@tabler/icons-react";
import { Card, CardHeader, CardContent, CardFooter } from "../ui/card";
import { renderTime } from "@/lib/map";

export default function FollowCard({ vehicle }: { vehicle: Vehicle }) {
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
    <div className="fixed bottom-16 w-screen p-4 flex justify-center">
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
        <CardContent className="flex justify-between pt-3">
          {/* TODO: Lateness */}
          <p className="text-muted-foreground text-xs flex gap-1">
            <IconHourglass size={16} /> Running on time
          </p>
          <p className="text-muted-foreground text-xs flex gap-1">
            <IconClock size={16} /> {distanceToNow}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
