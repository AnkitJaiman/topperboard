import "./globals.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import NavLinks from "@/components/NavLinks";
import FavFix from "@/components/FavFix";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Topper Board · Pay More. Rank Higher. Get Seen.", template: "%s · Topper Board" },
  description: "India's pay-to-rank public leaderboard. Bid in rupees, climb the board, get clicks. Ranked only by verified bids.",
  openGraph: { title: "Topper Board", description: "Pay More. Rank Higher. Get Seen. India's pay-to-rank leaderboard.", siteName: "Topper Board", locale: "en_IN", type: "website" },
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏆</text></svg>" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#111114" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body>
        <header className="hdr">
          <div className="wrap">
            <Link href="/" className="brand"><i aria-hidden>TB</i>TOPPER BOARD</Link>
            <NavLinks />
          </div>
        </header>
        <FavFix />
        <main className="page"><div className="wrap">{children}</div></main>
        <footer className="ftr">
          <div className="wrap">
            <div>© {new Date().getFullYear()} Topper Board · Founded by Ankit Jaiman · Sponsored listings ranked by verified bids · Made in India</div>
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
