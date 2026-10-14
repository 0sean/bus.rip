import type { NocLine } from "@prisma/client";
import type { ReactNode } from "react";
export default function InfoLayout({
  children,
  operator,
}: {
  children: ReactNode;
  operator: NocLine;
}) {
  return (
    <div className="p-8">
      <div className="flex gap-4 items-center mb-8">
        <img src="/logo.svg" alt="bus.rip logo" width={32} height={32} />
        <p className="text-sm text-zinc-400 font-medium">
          {operator.publicName}
        </p>
      </div>
      <div>{children}</div>
    </div>
  );
}
