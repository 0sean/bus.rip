import { Link } from "@tanstack/react-router";
import { CircleQuestionMark } from "lucide-react";
import { cn } from "cn";
import StackedLogo from "@/components/StackedLogo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function Header({
  operatorName,
  className,
}: {
  operatorName?: string;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex w-full min-h-[35px] items-center justify-between gap-4",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Link
          to="/"
          aria-label="Choose an operator"
          className="shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <StackedLogo aria-hidden />
        </Link>
        {operatorName ? (
          <p className="truncate text-xs font-medium text-muted-foreground">
            {operatorName}
          </p>
        ) : null}
      </div>
      <div
        className={cn(
          "flex items-center gap-2 text-muted-foreground/50",
          operatorName && "hidden text-muted-foreground sm:flex",
        )}
      >
        <p className="font-semibold text-xs">Bus info that actually works</p>
        <Dialog>
          <DialogTrigger
            aria-label="About bus.rip"
            className="cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <CircleQuestionMark size={16} aria-hidden />
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
    </header>
  );
}
