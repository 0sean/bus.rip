import { createFileRoute } from "@tanstack/react-router";
import { operatorsOptions, staticQuery } from "@/data/queries";
import StackedLogo from "@/components/StackedLogo";
import { CircleQuestionMark } from "lucide-react";
import { OperatorForm } from "@/components/OperatorForm";
import { Navbar } from "@/components/Navbar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await context.queryClient.query(staticQuery(operatorsOptions()));
  },
  headers: () => ({
    "Cache-Control":
      "public, max-age=2592000, s-maxage=2592000, stale-while-revalidate=86400",
  }),
  component: Home,
});

function Home() {
  return (
    <div className="safe-area-page flex flex-col min-h-svh gap-6">
      <Header />
      <Content />
      <Navbar />
    </div>
  );
}

export function Header() {
  return (
    <div className="flex w-full items-center justify-between">
      <StackedLogo />
      <div className="flex gap-2 text-muted-foreground/50">
        <p className="font-semibold text-xs">Bus info that actually works</p>
        <Dialog>
          <DialogTrigger>
            <CircleQuestionMark size={16} className="cursor-pointer" />
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bus info that actually works</DialogTitle>
            </DialogHeader>
            <DialogDescription>
              Info from bus operators in the UK tends to be about as reliable as
              their buses (which is not very).
              <br />
              bus.rip was created to provide a reliable source of bus
              information.
            </DialogDescription>
            <DialogDescription>
              Using data from the{" "}
              <a
                href="https://data.bus-data.dft.gov.uk/"
                target="_blank"
                className="underline"
              >
                Bus Open Data Service
              </a>
              , it allows you to see the location, timetable and fares for any
              bus service in the UK.
            </DialogDescription>
            <DialogDescription>
              bus.rip is fully open source and available on{" "}
              <a
                href="https://github.com/0sean/bus.rip"
                target="_blank"
                className="underline"
              >
                GitHub
              </a>
              .
            </DialogDescription>
            <DialogDescription>
              bus.rip is a{" "}
              <a
                href="https://transit.fyi/"
                target="_blank"
                className="underline"
              >
                Transit.fyi
              </a>{" "}
              project.
            </DialogDescription>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function Content() {
  return (
    <div className="flex flex-col gap-4 grow justify-end">
      <div>
        <h1 className="text-3xl font-bold">Find any bus in the UK</h1>
        <p className="text-muted-foreground font-semibold">
          Powered by Bus Open Data Service
        </p>
      </div>
      <OperatorForm to="/map/$nocCode" />
    </div>
  );
}
