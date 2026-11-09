import { cookies } from "next/headers";
import { ADMIN_COOKIE, endAllSessions, isAdmin, sameOrigin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function POST() {
  if (sameOrigin() && (await isAdmin())) await endAllSessions();
  cookies().delete(ADMIN_COOKIE);
  return new Response(null, { status: 303, headers: { location: "/admin/login" } });
}
