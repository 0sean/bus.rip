import HomeForm from "@/components/HomeForm";
import { getNocLines } from "@/utils/getNocLines";

export default async function Home() {
  const lines = await getNocLines();

  return (
    <div className="flex flex-col justify-center h-full p-8 md:p-12">
      <HomeForm lines={lines} />
      <div className="absolute bottom-8 left-8 md:bottom-12 md:left-12 flex flex-col gap-1">
        <a
          href="https://transit.fyi/"
          className="text-zinc-500 hover:text-zinc-100 transition-colors text-sm"
          target="_blank"
        >
          A <span className="font-semibold">Transit.fyi</span> project
        </a>
        <a
          href="https://www.bus-data.dft.gov.uk/"
          className="text-zinc-500 hover:text-zinc-100 transition-colors text-xs"
          target="_blank"
        >
          Powered by{" "}
          <span className="font-semibold">Bus Open Data Service</span>
        </a>
      </div>
    </div>
  );
}
