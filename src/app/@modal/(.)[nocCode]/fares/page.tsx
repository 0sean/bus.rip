import Fares from "@/components/pages/Fares";
import { DrawerTitle } from "@/components/ui/drawer";

export default function FaresModal() {
  return (
    <div className="px-4 py-6">
      <DrawerTitle className="text-3xl font-semibold">Fares</DrawerTitle>
      <Fares />
    </div>
  );
}
