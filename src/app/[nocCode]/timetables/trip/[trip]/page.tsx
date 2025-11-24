import Trip from "@/components/pages/Trip";
import { getTrip } from "@/lib/buslane";

export default async function TripPage({
  params,
}: {
  params: Promise<{ nocCode: string; trip: string }>;
}) {
  const { trip: tripId } = await params,
    trip = await getTrip(tripId);

  return <>{!("error" in trip) && <Trip trip={trip} />}</>;
}
