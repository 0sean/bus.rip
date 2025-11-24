import { PrismaClient } from "@prisma/client";
import { cache } from "react";

export const revalidate = 2630000;

const prisma = new PrismaClient();

export const getNocLines = cache(async () => {
  const nocLines = await prisma.nocLine.findMany();

  return nocLines;
});

export const getNocLine = cache(async (nocCode: string) => {
  const nocLine = await prisma.nocLine.findFirst({
    where: {
      nocCode,
    },
  });

  if (!nocLine) {
    throw new Error(`NOC line with code ${nocCode} not found`);
  }

  return nocLine;
});
