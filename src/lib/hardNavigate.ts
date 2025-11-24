"use server";

import { redirect } from "next/navigation";

export async function hardNavigate(path: string) {
  redirect(path);
}
