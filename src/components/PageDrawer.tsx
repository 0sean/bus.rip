"use client";

import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { usePathname, useRouter } from "next/navigation";
import { useRef } from "react";

export default function PageDrawer({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname(),
    router = useRouter();

  return (
    <Drawer
      open={pathname.split("/").length != 2}
      onClose={() => router.push(pathname.split("/").slice(0, 2).join("/"))}
    >
      <DrawerContent className="w-full md:w-128 mx-auto h-full !max-h-[calc(100svh-110px)] bg-zinc-900 border-3 !border-t-3 border-zinc-600/50">
        <DrawerTitle className="hidden">{title}</DrawerTitle>
        <div className="px-4 py-6">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
