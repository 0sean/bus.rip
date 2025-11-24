import Timetables from "@/components/pages/Timetables";
import { DrawerTitle } from "@/components/ui/drawer";
import { getRoutes } from "@/lib/buslane";

export default async function TimetablesModal({
  params,
}: {
  params: Promise<{ nocCode: string }>;
}) {
  const { nocCode } = await params,
    routes = await getRoutes(nocCode);

  return (
    <div className="px-4 py-6 flex h-full flex-col">
      <DrawerTitle className="text-3xl font-semibold">Timetables</DrawerTitle>
      <Timetables routes={Array.isArray(routes) ? routes : []} noc={nocCode} />
    </div>
  );
}
