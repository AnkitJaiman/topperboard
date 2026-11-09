export default function NotFound() {
  return (
    <div className="empty">
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Not found</h1>
      <p>This page or listing doesn&apos;t exist. <a href="/" style={{ color: "var(--link)" }}>Back to the board</a></p>
    </div>
  );
}
