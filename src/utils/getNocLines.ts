import { PrismaClient } from "@prisma/client";
import { cache } from "react";

export const revalidate = 2630000;

export const getNocLines = cache(async () => {
    const prisma = new PrismaClient(),
        nocLines = await prisma.nocLine.findMany();

    prisma.$disconnect();

    return nocLines;
})