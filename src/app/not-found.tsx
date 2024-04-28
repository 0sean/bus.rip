import Error from "next/error";
import { headers } from "next/headers";

export default function NotFound() {
  const h = headers();
  console.log({ statusCode: 404, cf_ip: h.get("CF-Connecting-IP") });
  return (
    <div className="flex flex-col justify-center h-full p-8 text-center">
      <h1 className="text-zinc-100 text-3xl font-bold">404</h1>
      <h2 className="text-zinc-400 text-md font-semibold">Not found</h2>
    </div>
  );
}
