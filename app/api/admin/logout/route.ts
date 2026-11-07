import { cookies } from "next/headers";
import { ADMIN_COOKIE } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function POST() {
  cookies().delete(ADMIN_COOKIE);
  return new Response(null, { status: 303, headers: { location: "/admin/login" } });
}
