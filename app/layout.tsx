import "@fontsource/instrument-sans/400.css";
import "@fontsource/instrument-sans/500.css";
import "@fontsource/instrument-sans/600.css";
import "@fontsource/instrument-sans/700.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/jetbrains-mono/700.css";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import NavLinks from "@/components/NavLinks";
import FavFix from "@/components/FavFix";
import VisitBeacon from "@/components/VisitBeacon";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Topper Board · Pay More. Rank Higher. Get Seen.", template: "%s · Topper Board" },
  description: "India's pay-to-rank public leaderboard. Bid in rupees, climb the board, get clicks. Ranked only by verified bids.",
  openGraph: { title: "Topper Board", description: "Pay More. Rank Higher. Get Seen. India's pay-to-rank leaderboard.", siteName: "Topper Board", locale: "en_IN", type: "website" },
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='4' fill='%230d0f14'/><rect x='7' y='13' width='5' height='12' fill='white'/><rect x='14' y='6' width='5' height='19' fill='white'/><rect x='21' y='17' width='5' height='8' fill='white'/></svg>" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#111114" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <header className="hdr">
          <div className="wrap">
            <Link href="/" className="brand"><span className="mark" aria-hidden><i /><i /><i /></span>TOPPER BOARD</Link>
            <NavLinks />
          </div>
        </header>
        <FavFix />
        <VisitBeacon />
        <main className="page" id="main" tabIndex={-1}><div className="wrap">{children}</div></main>
        <footer className="ftr">
          <div className="wrap">
            <div>© {new Date().getFullYear()} Topper Board · Founded by Ankit Jaiman, Jaipur · All positions are paid placements</div>
            <nav aria-label="Footer">
              <Link href="/about">About</Link><Link href="/rules">Rules</Link><Link href="/faq">FAQ</Link>
              <Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/refunds">Refunds</Link><Link href="/contact">Contact</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
