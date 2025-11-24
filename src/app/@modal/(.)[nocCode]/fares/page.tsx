import Fares from "@/components/pages/Fares";
import { DrawerTitle } from "@/components/ui/drawer";

export default function FaresModal() {
  return (
    <div className="px-4 py-6 grow flex flex-col">
      <DrawerTitle className="text-3xl font-semibold">Fares</DrawerTitle>
      {/* <Fares /> */}
      <p className="text-xl text-center p-8 my-auto font-semibold opacity-50">
        Coming soon.
      </p>
    </div>
  );
}
