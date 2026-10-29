import type { NocLine } from "@/db/schema";
import type { ReactNode } from "react";
export default function InfoLayout({
  children,
  operator,
}: {
  children: ReactNode;
  operator: NocLine;
}) {
  return (
    <div className="safe-area-content">
      <div className="flex gap-4 items-center mb-8">
        <img src="/logo.svg" alt="bus.rip logo" width={32} height={32} />
        <p className="text-sm font-medium">{operator.publicName}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}
