export const dynamic = "force-dynamic";
export const metadata = { title: "Admin login", robots: { index: false } };

const MSG: Record<string, string> = { wrong: "Wrong password.", rate: "Too many attempts. Try again in 15 minutes.", origin: "Please submit the form from this site." };

export default function Login({ searchParams }: { searchParams: { e?: string } }) {
  return (
    <form method="post" action="/api/admin/login" className="card pad" style={{ maxWidth: 380, margin: "40px auto", display: "grid", gap: 12 }}>
      <h1 style={{ fontSize: 22 }}>Admin</h1>
      <label htmlFor="pw" className="small muted">Password</label>
      <input id="pw" className="input" type="password" name="password" required autoComplete="current-password" />
      {searchParams.e && <div className="err" role="alert">{MSG[searchParams.e] || "Login failed."}</div>}
      <button className="btn" type="submit">Log in</button>
    </form>
  );
}
