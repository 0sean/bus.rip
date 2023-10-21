import { PrismaClient } from "@prisma/client";
import { cache } from "react";

export const revalidate = 2630000;

const prisma = new PrismaClient();

export const getNocLines = cache(async () => {
  const nocLines = await prisma.nocLine.findMany();

  return nocLines;
});
