import Timetables from "@/components/pages/Timetables";
import { getRoutes } from "@/lib/buslane";

export default async function TimetablesPage({
  params,
}: {
  params: Promise<{ nocCode: string }>;
}) {
  const { nocCode } = await params,
    routes = await getRoutes(nocCode);

  return (
    <>
      <h1 className="text-3xl font-semibold">Timetables</h1>
      <Timetables routes={Array.isArray(routes) ? routes : []} />
    </>
  );
}
