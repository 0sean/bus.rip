import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { fetchNocLines } from "@/lib/traveline";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("Authorization");
  if (auth != `Bearer ${process.env.CRON_TOKEN}`) {
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }

  const prisma = new PrismaClient(),
    lines = await fetchNocLines();

  await prisma.nocLine.deleteMany({});

  await prisma.nocLine.createMany({
    data: lines,
  });

  await prisma.$disconnect();
  return Response.json({ success: true });
}
