import { cookies } from "next/headers";
import { ADMIN_COOKIE, ADMIN_TTL, makeSession, passwordOk, sameOrigin } from "@/lib/admin";
import { rateLimit } from "@/lib/util";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const back = (err?: string) =>
    new Response(null, { status: 303, headers: { location: err ? `/admin/login?e=${err}` : "/admin" } });
  if (!sameOrigin()) return back("origin");
  if (!(await rateLimit(req.headers, "admin-login", 5, 900))) return back("rate");
  const form = await req.formData();
  if (!passwordOk(form.get("password"))) return back("wrong");
  cookies().set(ADMIN_COOKIE, makeSession(), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: ADMIN_TTL,
  });
  return back();
}
