import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bubbly Adventure Club",
  description: "Weekly missions and Adventure Books for Bubbly Nursery.",
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-GB"><body>{children}</body></html>;
}
