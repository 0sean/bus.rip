import {
  IconCalendarMonthFilled,
  IconCoins,
  IconMapPinFilled,
} from "@tabler/icons-react";
import type { Icon as IconType } from "@tabler/icons-react";
import { Link, useLocation } from "@tanstack/react-router";
import { clsx } from "cn";
import * as motion from "motion/react-client";

export function Navbar() {
  return (
    <div className="bg-neutral-950 shadow-lg border rounded-full p-1.5 w-fit mx-auto flex gap-2">
      <NavbarItem icon={IconMapPinFilled} to="/" />
      <NavbarItem icon={IconCalendarMonthFilled} to="/timetables" />
      <NavbarItem icon={IconCoins} to="/fares" />
    </div>
  );
}

function NavbarItem({ icon, to }: { icon: IconType; to: string }) {
  const Icon = icon;
  const location = useLocation();
  const active = location.pathname === to;

  return (
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
  );
}
