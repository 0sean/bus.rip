"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { FiArrowLeft, FiChevronLeft } from "react-icons/fi";

const BackContext = createContext<boolean>(false);

export function BackWatcher({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(),
    initialLoad = useRef<boolean>(false),
    [navigated, setNavigated] = useState<boolean>(false);

  useEffect(() => {
    if (initialLoad.current === false) {
      initialLoad.current = true;
    } else {
      setNavigated(true);
    }
  }, [pathname]);

  return <BackContext value={navigated}>{children}</BackContext>;
}

export function Back() {
  const navigated = useContext(BackContext),
    router = useRouter();

  if (!navigated) return <></>;

  return (
    <div
      className="flex gap-2 items-center text-zinc-400 hover:text-zinc-300 transition-colors cursor-pointer"
      onClick={() => router.back()}
    >
      <FiArrowLeft />
      <span className="text-sm font-medium">Back</span>
    </div>
  );
}
