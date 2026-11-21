import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "SYLUTION TRADE | Global B2B Marketplace",
  description: "Discover global wholesale products, find suppliers and request quotations on SYLUTION TRADE."
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
