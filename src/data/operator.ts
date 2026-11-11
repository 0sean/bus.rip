import type { QueryClient } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import { operatorOptions, staticQuery } from "./queries";

export async function loadOperator(queryClient: QueryClient, nocCode: string) {
  const operator = await queryClient.query(
    staticQuery(operatorOptions(nocCode)),
  );
  if (!operator) throw notFound();
  return operator;
}
