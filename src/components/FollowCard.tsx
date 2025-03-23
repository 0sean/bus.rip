import { VehicleActivity } from "@/lib/bods";
import { Alert } from "./ui/alert";
import { formatDistanceToNow } from "date-fns";

export default function FollowCard({ follow }: { follow: VehicleActivity }) {
  return (
    <div className="fixed bottom-4 w-full p-4">
      <Alert className="w-full">
        <div className="flex w-full">
          <div className="w-[40%]">
            <p className="text-2xl font-semibold mb-1.5">
              {follow.MonitoredVehicleJourney[0].OriginAimedDepartureTime !=
              undefined
                ? new Date(
                    follow.MonitoredVehicleJourney[0].OriginAimedDepartureTime[0],
                  )
                    .getHours()
                    .toString()
                    .padStart(2, "0")
                : "-"}
              :
              {follow.MonitoredVehicleJourney[0].OriginAimedDepartureTime !=
              undefined
                ? new Date(
                    follow.MonitoredVehicleJourney[0].OriginAimedDepartureTime[0],
                  )
                    .getMinutes()
                    .toString()
                    .padStart(2, "0")
                : "-"}
            </p>
            <p className="leading-tight text-sm">
              {follow.MonitoredVehicleJourney[0].OriginName[0].replaceAll(
                "_",
                " ",
              )}
            </p>
          </div>
          <div className="w-[20%] flex justify-center items-center">
            <svg
              width="14"
              height="16"
              viewBox="0 0 14 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M13.7062 8.70625L8.70624 13.7062C8.51249 13.9031 8.25624 14 7.99999 14C7.74374 14 7.48812 13.9023 7.29312 13.707C6.90249 13.3164 6.90249 12.6836 7.29312 12.293L10.5875 9H0.999999C0.447812 9 4.95911e-05 8.55312 4.95911e-05 8C4.95911e-05 7.44688 0.447812 7 0.999999 7H10.5875L7.29374 3.70625C6.90312 3.31563 6.90312 2.68282 7.29374 2.29219C7.68437 1.90157 8.31718 1.90157 8.70781 2.29219L13.7078 7.29219C14.0969 7.68438 14.0969 8.31563 13.7062 8.70625Z"
                fill="white"
              />
            </svg>
          </div>
          <div className="w-[40%] text-end">
            <p className="text-2xl font-semibold mb-1.5">
              {follow.MonitoredVehicleJourney[0].DestinationAimedArrivalTime !=
              undefined
                ? new Date(
                    follow.MonitoredVehicleJourney[0].DestinationAimedArrivalTime[0],
                  )
                    .getHours()
                    .toString()
                    .padStart(2, "0")
                : "-"}
              :
              {follow.MonitoredVehicleJourney[0].DestinationAimedArrivalTime !=
              undefined
                ? new Date(
                    follow.MonitoredVehicleJourney[0].DestinationAimedArrivalTime[0],
                  )
                    .getMinutes()
                    .toString()
                    .padStart(2, "0")
                : "-"}
            </p>
            <p className="leading-tight text-sm">
              {follow.MonitoredVehicleJourney[0].DestinationName[0].replaceAll(
                "_",
                " ",
              )}
            </p>
          </div>
        </div>
        <p className="mt-2 opacity-50 text-[11px]">
          Updated{" "}
          {formatDistanceToNow(follow.RecordedAtTime[0], {
            addSuffix: true,
            includeSeconds: true,
          })}
        </p>
      </Alert>
    </div>
  );
}
