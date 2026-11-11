import { useLocation, useRouter } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { FiArrowLeft } from "react-icons/fi";

const BackContext = createContext<boolean>(false);

export function BackWatcher({ children }: { children: React.ReactNode }) {
  const pathname = useLocation({ select: (location) => location.pathname }),
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
    <button
      type="button"
      className="flex gap-2 items-center text-muted-foreground hover:text-primary transition-colors cursor-pointer"
      onClick={() => router.history.back()}
    >
      <FiArrowLeft />
      <span className="text-sm font-medium">Back</span>
    </button>
  );
}
