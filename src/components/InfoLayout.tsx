import { getNocLine } from "@/utils/getNocLines";
import Image from "next/image";

export default async function InfoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ nocCode: string }>;
}) {
  const { nocCode } = await params,
    operator = await getNocLine(nocCode);

  return (
    <div className="p-8">
      <div className="flex gap-4 items-center mb-8">
        <Image src="/logo.svg" alt="bus.rip logo" width={32} height={32} />
        <p className="text-sm text-zinc-400 font-medium">
          {operator.publicName}
        </p>
      </div>
      <div>{children}</div>
    </div>
  );
}
