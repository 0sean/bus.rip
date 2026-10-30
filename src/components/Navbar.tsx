import {
  IconCalendarMonthFilled,
  IconCoins,
  IconMapPinFilled,
} from "@tabler/icons-react";
import type { Icon as IconType } from "@tabler/icons-react";
import { Link, useLocation, useParams } from "@tanstack/react-router";
import { clsx } from "cn";
import * as motion from "motion/react-client";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

function relative(
  path: string,
  location: { pathname: string },
  params: Record<string, string>,
) {
  if (params.nocCode) return `${path}/${params.nocCode}`;
  if (location.pathname === "/map") return path;
  if (
    path === "/map" &&
    (location.pathname === "/timetables" || location.pathname === "/fares")
  )
    return "/";
  return path;
}

export function Navbar() {
  const location = useLocation();
  const params = useParams({ strict: false });

  return (
    <div className="bg-white dark:bg-neutral-950 shadow-lg border rounded-full p-1.5 w-fit mx-auto flex gap-2 pointer-events-auto">
      <NavbarItem
        icon={IconMapPinFilled}
        to={relative("/map", location, params)}
        title="Location"
      />
      <NavbarItem
        icon={IconCalendarMonthFilled}
        to={relative("/timetables", location, params)}
        title="Timetables"
      />
      <NavbarItem
        icon={IconCoins}
        to={relative("/fares", location, params)}
        title="Fares"
      />
    </div>
  );
}

function NavbarItem({
  icon,
  to,
  title,
}: {
  icon: IconType;
  to: string;
  title: string;
}) {
  const Icon = icon;
  const location = useLocation();
  const active =
    location.pathname.startsWith(to) ||
    (to === "/map" && location.pathname === "/");

  return (
    <Tooltip>
      <TooltipTrigger>
        <Link
          to={to}
          className={clsx(
            "relative isolate size-10 rounded-full flex justify-center items-center",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !active && "z-10",
          )}
        >
          {active ? (
            <motion.div
              layoutId="navbar-active-background"
              className="pointer-events-none absolute inset-0 z-0 rounded-full border bg-background"
              transition={{ type: "spring", stiffness: 450, damping: 35 }}
            />
          ) : null}
          <Icon size={22} className="z-2" />
        </Link>
      </TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  );
}
