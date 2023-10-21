import TrackForm from "@/components/TrackForm";
import { getNocLines } from "@/utils/getNocLines"

export default async function Home() {
    const lines = await getNocLines();
    return <div className="flex flex-col justify-center h-full p-8">
        <h1 className="text-zinc-100 text-3xl font-bold">bus.rip</h1>
        <h2 className="text-zinc-400 text-md font-semibold">Tracking that actually works</h2>
        <h3 className="text-zinc-500 text-xs font-semibold mb-4">Powered by the <a className="hover:underline hover:text-zinc-400 transition-all" href="https://www.bus-data.dft.gov.uk/">Bus Open Data Service</a></h3>
        <TrackForm lines={lines} />
    </div>
}