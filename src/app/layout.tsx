import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter, Michroma, Montserrat } from "next/font/google";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { SiteChrome } from "@/components/SiteChrome";
import { getSession } from "@/lib/auth";
import { decideProductAccess, getProductAccessMode } from "@/lib/product-access";
import { ONE_LINER, PRODUCT_NAME } from "@/lib/site";
import "./globals.css";

const michroma = Michroma({ weight: "400", subsets: ["latin"], variable: "--font-michroma", display: "swap" });
const montserrat = Montserrat({ weight: ["400", "500", "600"], subsets: ["latin"], variable: "--font-montserrat", display: "swap" });
const inter = Inter({ weight: ["600", "700", "800"], subsets: ["latin"], variable: "--font-inter", display: "swap" });
const plexMono = IBM_Plex_Mono({ weight: ["400", "500"], subsets: ["latin"], variable: "--font-plex-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: `${PRODUCT_NAME} · Join the waitlist`, template: `%s · ${PRODUCT_NAME}` },
  description: ONE_LINER,
  openGraph: { title: PRODUCT_NAME, description: ONE_LINER, images: ["/hero-rock.jpg"] },
};

export const viewport: Viewport = { themeColor: "#070A14" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  // Only signed-in people can ever enter the product, so skip the lookup for visitors.
  const showApp = session
    ? decideProductAccess(session.profile, true, await getProductAccessMode()).allowed
    : false;
  return (
    <html lang="en" className={`${michroma.variable} ${montserrat.variable} ${inter.variable} ${plexMono.variable}`}>
      <body>
        <SiteChrome>
          <Nav signedIn={Boolean(session)} isAdmin={session?.profile?.role === "admin"} showApp={showApp} />
        </SiteChrome>
        <main>{children}</main>
        <SiteChrome>
          <Footer />
        </SiteChrome>
      </body>
    </html>
  );
}
