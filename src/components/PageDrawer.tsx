import type { ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";
export default function PageDrawer({
  children,
  nocCode,
}: {
  children: ReactNode;
  nocCode: string;
}) {
  const navigate = useNavigate();
  return (
    <Drawer
      open
      onOpenChange={(open) => {
        if (open) return;
        void navigate({
          to: "/map/$nocCode",
          params: { nocCode },
          state: { mapView: true },
          search: {},
        });
      }}
    >
      <DrawerContent className="w-full md:w-128 mx-auto h-full !max-h-[calc(100svh-110px)] bg-background border-3 !border-t-3 border-border">
        <DrawerClose
          render={
            <button
              type="button"
              aria-label="Close operator information"
              className="absolute top-3 right-3 rounded p-2 text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          }
        />
        <DrawerTitle className="sr-only">Operator information</DrawerTitle>
        <DrawerDescription className="sr-only">
          Timetables, routes, and trip details
        </DrawerDescription>
        <div className="px-4 py-6 flex h-full min-h-0 flex-col">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
