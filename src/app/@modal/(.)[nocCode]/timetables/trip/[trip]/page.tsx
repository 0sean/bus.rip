import Trip from "@/components/pages/Trip";
import { DrawerTitle } from "@/components/ui/drawer";
import { getTrip } from "@/lib/buslane";

export default async function TripModal({
  params,
}: {
  params: Promise<{ nocCode: string; trip: string }>;
}) {
  const { trip: tripId } = await params,
    trip = await getTrip(tripId);

  return (
    <>
      <DrawerTitle className="sr-only">Trip Details</DrawerTitle>
      <div className="px-4 pb-6 h-full flex flex-col">
        {!("error" in trip) && <Trip trip={trip} />}
      </div>
    </>
  );
}
